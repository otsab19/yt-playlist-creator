"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Heart, ListMusic, Sparkles, Loader2, Check, Plus,
  ChevronRight, RefreshCw, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaylistOutput } from "@/components/playlist-output";
import { SongRow } from "@/components/song-row";
import { useSession, signIn } from "next-auth/react";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast";
import { getProvider } from "@/lib/llm/models";
import type { SongEntry } from "@/lib/types";
import type { ProviderKey } from "@/lib/llm/types";

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

interface YTVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface YTPlaylist {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
}

type Tab = "liked" | "playlists";

export default function MyMusicPage() {
  const { data: session, status: authStatus } = useSession();
  const { keys } = useSettings();
  const { error: showError, success: showSuccess } = useToast();

  const [tab, setTab] = useState<Tab>("liked");
  const [likedVideos, setLikedVideos] = useState<YTVideo[]>([]);
  const [playlists, setPlaylists] = useState<YTPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YTPlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [totalLiked, setTotalLiked] = useState(0);

  // Selected videos for playlist building
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // AI recommendation state
  const [genSongs, setGenSongs] = useState<SongEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [savingToYT, setSavingToYT] = useState(false);
  const [usedModel, setUsedModel] = useState("");

  const fetchLiked = useCallback(async (pageToken?: string) => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const url = `/api/youtube-library?type=liked&accessToken=${encodeURIComponent(session.accessToken)}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLikedVideos(prev => pageToken ? [...prev, ...data.videos] : data.videos);
      setNextPage(data.nextPageToken);
      setTotalLiked(data.totalResults || 0);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load liked videos");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, showError]);

  const fetchPlaylists = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const url = `/api/youtube-library?type=playlists&accessToken=${encodeURIComponent(session.accessToken)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlaylists(data.playlists || []);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load playlists");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, showError]);

  const fetchPlaylistItems = useCallback(async (pl: YTPlaylist) => {
    if (!session?.accessToken) return;
    setSelectedPlaylist(pl);
    setPlaylistVideos([]);
    setLoading(true);
    try {
      const url = `/api/youtube-library?type=playlist-items&playlistId=${encodeURIComponent(pl.id)}&accessToken=${encodeURIComponent(session.accessToken)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlaylistVideos(data.videos || []);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load playlist");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, showError]);

  useEffect(() => {
    if (session?.accessToken && tab === "liked" && likedVideos.length === 0) {
      fetchLiked();
    }
    if (session?.accessToken && tab === "playlists" && playlists.length === 0) {
      fetchPlaylists();
    }
  }, [session?.accessToken, tab, likedVideos.length, playlists.length, fetchLiked, fetchPlaylists]);

  function toggleSelect(videoId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(videoId) ? next.delete(videoId) : next.add(videoId);
      return next;
    });
  }

  function selectAll(videos: YTVideo[]) {
    setSelected(new Set(videos.map(v => v.videoId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function getSelectedVideos(): YTVideo[] {
    const source = tab === "liked" ? likedVideos : playlistVideos;
    return source.filter(v => selected.has(v.videoId));
  }

  async function generateRecommendations() {
    const selectedVids = getSelectedVideos();
    if (selectedVids.length === 0) {
      showError("Select some songs first.");
      return;
    }

    const provider = (keys.selectedProvider || "gemini") as ProviderKey;
    const providerMeta = getProvider(provider);
    const apiKey = keys[provider as keyof typeof keys] as string;
    if (!apiKey && provider !== "ollama") {
      showError(`Set your ${providerMeta.name} API key in Settings.`);
      return;
    }

    const songList = selectedVids
      .slice(0, 30)
      .map(v => `"${v.title}" by ${v.channel}`)
      .join("\n");

    const prompt = `Based on these songs from my YouTube library, create a playlist of 15-20 new song recommendations that match my taste. Include songs with similar vibes, genres, and energy. Mix popular and lesser-known tracks. Do NOT include any of the songs I listed.

My songs:
${songList}`;

    setGenerating(true);
    setGenSongs([]);
    try {
      const res = await fetch("/api/llm-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          apiKey,
          model: keys.selectedModel || undefined,
          provider,
          baseUrl: provider === "ollama" ? keys.ollamaBaseUrl : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const entries: SongEntry[] = (data.songs || []).map((s: { title: string; artist?: string }) => ({
        id: nanoid(),
        title: s.title,
        artist: s.artist || "",
        status: "idle" as const,
      }));
      setGenSongs(entries);
      setUsedModel(data.model || "");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  }

  async function searchAll() {
    if (!keys.youtube && !session?.accessToken) {
      showError("Sign in or add YouTube API key.");
      return;
    }
    setSearching(true);
    let shownError = false;
    const updated = [...genSongs];
    const BATCH = 3;

    for (let i = 0; i < updated.length; i += BATCH) {
      const batch = updated.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (song, bi) => {
          const idx = i + bi;
          updated[idx] = { ...updated[idx], status: "searching" };
          setGenSongs([...updated]);

          try {
            const res = await fetch("/api/youtube-search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: `${song.artist} ${song.title} official`,
                apiKey: keys.youtube || undefined,
                accessToken: session?.accessToken || undefined,
              }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const first = data.results?.[0];
            updated[idx] = first
              ? { ...updated[idx], videoId: first.videoId, videoTitle: first.title, status: "found" }
              : { ...updated[idx], status: "not_found" };
          } catch (e: unknown) {
            updated[idx] = { ...updated[idx], status: "not_found" };
            if (!shownError) { shownError = true; showError(e instanceof Error ? e.message : "YouTube search failed"); }
          }
          setGenSongs([...updated]);
        })
      );
    }
    setSearching(false);
  }

  function handleManualSet(id: string, videoId: string, videoTitle: string) {
    setGenSongs(prev => prev.map(s => s.id === id ? { ...s, videoId, videoTitle, status: "manual" } : s));
  }
  function handleRemove(id: string) {
    setGenSongs(prev => prev.filter(s => s.id !== id));
  }

  async function saveToYouTube(name: string) {
    if (!session?.accessToken) { signIn("google"); return; }
    const videoIds = genSongs.filter(s => s.videoId && (s.status === "found" || s.status === "manual")).map(s => s.videoId!);
    setSavingToYT(true);
    try {
      const res = await fetch("/api/youtube-save-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.accessToken, name, videoIds }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showSuccess(data.skipped > 0 ? `Saved "${name}" — ${data.added} added, ${data.skipped} skipped` : `Saved "${name}" (${data.added} songs) to YouTube!`);
      window.open(data.playlistUrl, "_blank");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to save playlist");
    } finally {
      setSavingToYT(false);
    }
  }

  // Not signed in
  if (authStatus === "loading") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--fg-muted)" }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--fg)" }}>My Music</h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--fg-muted)" }}>
            Sign in with Google to see your liked videos and playlists, then get AI-powered recommendations based on your taste.
          </p>
          <Button variant="primary" className="gap-2" onClick={() => signIn("google")}>
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  const currentVideos = tab === "liked" ? likedVideos : playlistVideos;
  const playlistTitle = selected.size > 0
    ? `Recommendations (${selected.size} songs)`
    : "Recommendations";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--fg)" }}>
          <Heart className="w-6 h-6 text-pink-400" />
          My Music
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
          Your liked videos & playlists — select songs and get AI recommendations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-input)" }}>
        {([
          { key: "liked" as Tab, label: "Liked Videos", icon: Heart, count: totalLiked },
          { key: "playlists" as Tab, label: "My Playlists", icon: ListMusic },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedPlaylist(null); setPlaylistVideos([]); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={tab === key
              ? { background: "var(--bg-card)", color: "var(--fg)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "var(--fg-muted)" }
            }
          >
            <Icon className="w-4 h-4" />
            {label}
            {count ? <span className="text-xs opacity-60">({count})</span> : null}
          </button>
        ))}
      </div>

      {/* Playlists browser */}
      {tab === "playlists" && !selectedPlaylist && (
        <div className="space-y-2">
          {loading && playlists.length === 0 && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--fg-muted)" }} />
            </div>
          )}
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => fetchPlaylistItems(pl)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer hover:ring-1"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {pl.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pl.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-input)" }}>
                  <ListMusic className="w-5 h-5" style={{ color: "var(--fg-faint)" }} />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm truncate" style={{ color: "var(--fg)" }}>{pl.title}</p>
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{pl.itemCount} videos</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--fg-faint)" }} />
            </button>
          ))}
        </div>
      )}

      {/* Back button for playlist drill-down */}
      {tab === "playlists" && selectedPlaylist && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedPlaylist(null); setPlaylistVideos([]); setSelected(new Set()); }}
            className="text-xs font-medium cursor-pointer hover:underline"
            style={{ color: "var(--accent)" }}
          >
            ← Back to playlists
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>{selectedPlaylist.title}</span>
        </div>
      )}

      {/* Video grid */}
      {(tab === "liked" || selectedPlaylist) && (
        <>
          {/* Selection bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => selectAll(currentVideos)} disabled={currentVideos.length === 0}>
              <Check className="w-3.5 h-3.5" />
              Select all
            </Button>
            {selected.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear ({selected.size})
                </Button>
                <Button variant="primary" size="sm" className="gap-1.5" onClick={generateRecommendations} disabled={generating}>
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {generating ? "Generating…" : `Get Recommendations (${selected.size})`}
                </Button>
              </>
            )}
          </div>

          {/* Videos */}
          {loading && currentVideos.length === 0 && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--fg-muted)" }} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentVideos.map(v => {
              const isSelected = selected.has(v.videoId);
              return (
                <button
                  key={v.videoId}
                  onClick={() => toggleSelect(v.videoId)}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left"
                  style={{
                    background: isSelected ? "color-mix(in srgb, var(--accent) 10%, var(--bg-card))" : "var(--bg-card)",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative shrink-0">
                    {v.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail} alt="" className="w-20 h-[45px] rounded-lg object-cover" />
                    ) : (
                      <div className="w-20 h-[45px] rounded-lg" style={{ background: "var(--bg-input)" }} />
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/40">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: "var(--fg)" }}>
                      {v.title}
                    </p>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>
                      {v.channel}
                    </p>
                  </div>
                  {!isSelected && (
                    <Plus className="w-4 h-4 shrink-0" style={{ color: "var(--fg-faint)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Load more */}
          {tab === "liked" && nextPage && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => fetchLiked(nextPage)} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {/* AI Recommendations */}
      {genSongs.length > 0 && (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--fg)" }}>
              <Sparkles className="w-5 h-5 text-yellow-400" />
              AI Recommendations
            </h2>
            {usedModel && (
              <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-input)", color: "var(--fg-muted)" }}>
                via {usedModel}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={searchAll} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {searching ? "Searching…" : "Search YouTube"}
              </Button>
            </div>
          </div>

          <PlaylistOutput
            songs={genSongs}
            title={playlistTitle}
            onSaveToYouTube={saveToYouTube}
            savingToYouTube={savingToYT}
          />

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {genSongs.map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={i}
                  onManualSet={handleManualSet}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
