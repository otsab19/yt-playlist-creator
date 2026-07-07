"use client";
import React, { useState } from "react";
import { Compass, Sparkles, Loader2, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MusicAutocomplete, type MusicResult } from "@/components/music-autocomplete";
import { SongRow } from "@/components/song-row";
import { PlaylistOutput } from "@/components/playlist-output";
import { SignInBanner } from "@/components/sign-in-banner";
import { useSession, signIn } from "next-auth/react";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast";
import { getProvider } from "@/lib/llm/models";
import type { SongEntry } from "@/lib/types";
import type { ProviderKey } from "@/lib/llm/types";

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

interface SimilarArtist {
  name: string;
  match: number;
  image: string | null;
}

export default function DiscoverPage() {
  const { keys } = useSettings();
  const { error: showError, success: showSuccess } = useToast();
  const { data: session } = useSession();

  const [selected, setSelected] = useState<MusicResult | null>(null);
  const [similar, setSimilar] = useState<SimilarArtist[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [savingToYT, setSavingToYT] = useState(false);
  const [usedModel, setUsedModel] = useState("");

  async function handleSelect(result: MusicResult) {
    setSelected(result);
    setSongs([]);
    setUsedModel("");
    setSimilar([]);

    if (result.type === "artist") {
      setLoadingSimilar(true);
      try {
        const res = await fetch(`/api/music-similar?artist=${encodeURIComponent(result.name)}`);
        const data = await res.json();
        setSimilar(data.similar || []);
      } catch { /* ignore */ }
      setLoadingSimilar(false);
    } else if (result.type === "tag") {
      setLoadingSimilar(true);
      try {
        const res = await fetch(`/api/music-similar?tag=${encodeURIComponent(result.name)}`);
        const data = await res.json();
        setSimilar((data.artists || []).map((a: { name: string; image: string | null }) => ({ ...a, match: 1 })));
      } catch { /* ignore */ }
      setLoadingSimilar(false);
    }
  }

  function buildPrompt(): string {
    if (!selected) return "";
    if (selected.type === "artist") {
      return `Create a playlist of 15-20 songs similar to ${selected.name}. Include some ${selected.name} songs and songs from similar artists. Mix well-known tracks with deeper cuts.`;
    }
    if (selected.type === "track") {
      return `Create a playlist of 15-20 songs similar to "${selected.name}" by ${selected.artist}. Match the mood, tempo, and style. Include the original song and similar tracks from various artists.`;
    }
    if (selected.type === "tag") {
      return `Create a playlist of 15-20 ${selected.name} songs. Include classic tracks and modern hits in the ${selected.name} genre. Mix well-known and lesser-known artists.`;
    }
    return "";
  }

  async function generatePlaylist() {
    const provider = (keys.selectedProvider || "gemini") as ProviderKey;
    const providerMeta = getProvider(provider);
    const apiKey = keys[provider as keyof typeof keys] as string;

    if (!apiKey && provider !== "ollama") {
      showError(`Set your ${providerMeta.name} API key in Settings.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/llm-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(),
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
        artist: s.artist || selected?.name || "",
        status: "idle" as const,
      }));
      setSongs(entries);
      setUsedModel(data.model || "");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to generate playlist");
    } finally {
      setLoading(false);
    }
  }

  async function searchAll() {
    if (!keys.youtube && !session?.accessToken) {
      showError("Sign in with Google or add a YouTube API key in Settings.");
      return;
    }
    setSearching(true);
    let shownError = false;
    const updated = [...songs];
    const BATCH = 3;

    for (let i = 0; i < updated.length; i += BATCH) {
      const batch = updated.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (song, bi) => {
          const idx = i + bi;
          updated[idx] = { ...updated[idx], status: "searching" };
          setSongs([...updated]);

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
            if (!shownError) {
              shownError = true;
              showError(e instanceof Error ? e.message : "YouTube search failed");
            }
          }
          setSongs([...updated]);
        })
      );
    }
    setSearching(false);
  }

  function handleManualSet(id: string, videoId: string, videoTitle: string) {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, videoId, videoTitle, status: "manual" } : s));
  }

  function handleRemove(id: string) {
    setSongs(prev => prev.filter(s => s.id !== id));
  }

  async function saveToYouTube(name: string) {
    if (!session?.accessToken) { signIn("google"); return; }
    const videoIds = songs.filter(s => s.videoId && (s.status === "found" || s.status === "manual")).map(s => s.videoId!);
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

  const playlistTitle = selected
    ? selected.type === "track"
      ? `Songs like "${selected.name}"`
      : selected.type === "tag"
        ? `${selected.name} Playlist`
        : `${selected.name} Mix`
    : "Discover Playlist";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SignInBanner />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--fg)" }}>
          <Compass className="w-6 h-6 text-purple-400" />
          Discover
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
          Search for an artist, song, or genre — get a curated playlist instantly.
        </p>
      </div>

      {/* Search */}
      <MusicAutocomplete onSelect={handleSelect} className="mb-6" />

      {/* Selected item + similar */}
      {selected && (
        <div className="space-y-4 mb-6">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
              {selected.type === "artist" && <Users className="w-5 h-5 text-white" />}
              {selected.type === "track" && <Sparkles className="w-5 h-5 text-white" />}
              {selected.type === "tag" && <span className="text-white font-bold text-sm">#</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base" style={{ color: "var(--fg)" }}>{selected.name}</p>
              <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                {selected.type === "track" && selected.artist ? `by ${selected.artist}` : selected.type}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="gap-2 shrink-0"
              onClick={generatePlaylist}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating…" : "Generate Playlist"}
            </Button>
          </div>

          {/* Similar artists */}
          {(similar.length > 0 || loadingSimilar) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--fg-faint)" }}>
                {selected.type === "tag" ? "Top Artists" : "Similar Artists"}
              </h3>
              {loadingSimilar ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--fg-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Loading…</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {similar.map(a => (
                    <button
                      key={a.name}
                      onClick={() => handleSelect({ name: a.name, type: "artist", image: a.image })}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer hover:ring-1"
                      style={{ background: "var(--bg-input)", color: "var(--fg)", border: "1px solid var(--border)" }}
                    >
                      {a.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <Users className="w-3.5 h-3.5" style={{ color: "var(--fg-muted)" }} />
                      )}
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generated songs */}
      {songs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg)" }}>{songs.length} Songs</h2>
            {usedModel && <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-input)", color: "var(--fg-muted)" }}>via {usedModel}</span>}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={searchAll} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {searching ? "Searching…" : "Search YouTube"}
              </Button>
            </div>
          </div>

          <PlaylistOutput
            songs={songs}
            title={playlistTitle}
            onSaveToYouTube={saveToYouTube}
            savingToYouTube={savingToYT}
          />

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {songs.map((song, i) => (
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
