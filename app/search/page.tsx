"use client";
import React, { useState, useRef } from "react";
import { Search, Plus, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaylistOutput } from "@/components/playlist-output";
import { useSession, signIn } from "next-auth/react";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast";
import type { SongEntry } from "@/lib/types";

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
}

export default function ManualSearchPage() {
  const { keys } = useSettings();
  const { error: showError, success: showSuccess } = useToast();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingToYT, setSavingToYT] = useState(false);
  const [playlist, setPlaylist] = useState<SongEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function doSearch() {
    if (!query.trim()) return;
    if (!keys.youtube) {
      showError("Please add your YouTube API key in Settings.");
      return;
    }
    setSearching(true);
    setResults([]);

    try {
      const res = await fetch("/api/youtube-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), apiKey: keys.youtube }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function addToPlaylist(result: SearchResult) {
    if (playlist.find(s => s.videoId === result.videoId)) return;
    setPlaylist(prev => [
      ...prev,
      {
        id: nanoid(),
        title: result.title,
        videoId: result.videoId,
        videoTitle: result.title,
        status: "found",
      },
    ]);
  }

  function removeFromPlaylist(id: string) {
    setPlaylist(prev => prev.filter(s => s.id !== id));
  }

  async function saveToYouTube(name: string) {
    if (!session?.accessToken) { signIn("google"); return; }
    const videoIds = playlist.filter(s => s.videoId).map(s => s.videoId!);
    setSavingToYT(true);
    try {
      const res = await fetch("/api/youtube-save-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.accessToken, name, videoIds }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showSuccess(`Saved "${name}" to your YouTube account!`);
      window.open(data.playlistUrl, "_blank");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to save playlist");
    } finally {
      setSavingToYT(false);
    }
  }

  const inPlaylist = (videoId: string) => playlist.some(s => s.videoId === videoId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <Search className="w-6 h-6 text-green-400" />
          Manual Song Search
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Search YouTube and build a playlist song by song.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a song, artist, or album…"
              onKeyDown={e => { if (e.key === "Enter") doSearch(); }}
              className="flex-1"
            />
            <Button variant="primary" onClick={doSearch} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-2.5 border-b text-xs font-medium uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--fg-faint)' }}>
                Results
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {results.map(result => (
                  <div key={result.videoId} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                    {result.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.thumbnail}
                        alt=""
                        className="w-14 h-10 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--fg)' }}>{result.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{result.channel}</p>
                    </div>
                    <Button
                      variant={inPlaylist(result.videoId) ? "success" : "outline"}
                      size="sm"
                      onClick={() => addToPlaylist(result)}
                      disabled={inPlaylist(result.videoId)}
                      className="shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {inPlaylist(result.videoId) ? "Added" : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searching && results.length === 0 && query && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--fg-faint)' }}>No results. Try a different search.</p>
          )}

          {!query && (
            <div className="text-center py-12" style={{ color: 'var(--fg-faint)' }}>
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Search for songs to build your playlist</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden sticky top-20" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>My Playlist</span>
              <span className="ml-1 text-xs" style={{ color: 'var(--fg-faint)' }}>{playlist.length} songs</span>
              {playlist.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs hover:text-red-400"
                  onClick={() => setPlaylist([])}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>

            {playlist.length === 0 ? (
              <div className="px-4 py-10 text-center" style={{ color: 'var(--fg-faint)' }}>
                <p className="text-sm">Add songs from search results</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                {playlist.map((song, i) => (
                  <div key={song.id} className="flex items-center gap-2 px-3 py-2.5 group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <span className="text-xs w-5 text-right shrink-0" style={{ color: 'var(--fg-faint)' }}>{i + 1}</span>
                    <p className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--fg)' }}>{song.title}</p>
                    <button
                      onClick={() => removeFromPlaylist(song.id)}
                      className="text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {playlist.length > 0 && (
              <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <PlaylistOutput
                  songs={playlist}
                  title="My Playlist"
                  onSaveToYouTube={saveToYouTube}
                  savingToYouTube={savingToYT}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
