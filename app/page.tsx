"use client";
import React, { useState } from "react";
import {
  Sparkles,
  Wand2,
  RefreshCw,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SongRow } from "@/components/song-row";
import { PlaylistOutput } from "@/components/playlist-output";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast";
import { getProvider } from "@/lib/llm/models";
import type { SongEntry } from "@/lib/types";
import type { ProviderKey } from "@/lib/llm/types";

const GENRE_CHIPS = [
  "Heavy Metal", "Classic Rock", "Hip-Hop", "Indie", "Pop", "Jazz",
  "Electronic", "R&B", "Country", "Punk", "Blues", "Reggae",
];

const MOOD_CHIPS = [
  "Energetic", "Chill", "Sad", "Happy", "Focus", "Party",
  "Workout", "Late Night", "Road Trip", "Romantic",
];

const EXAMPLE_PROMPTS = [
  "90s alternative rock for a road trip, mix of Nirvana, Pearl Jam and Soundgarden vibes",
  "Energetic hip-hop workout playlist, heavy bass, aggressive flow",
  "Chill lo-fi and jazz for late night studying",
  "80s hair metal anthems — Motley Crue, Def Leppard, Bon Jovi era",
  "Sad indie folk songs for a rainy day",
];

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AIPlaylistPage() {
  const { keys } = useSettings();
  const { error: showError } = useToast();
  const [prompt, setPrompt] = useState("");
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [usedModel, setUsedModel] = useState("");

  function appendChip(chip: string) {
    setPrompt(p => p ? `${p}, ${chip}` : chip);
  }

  async function generatePlaylist() {
    const provider = (keys.selectedProvider || "gemini") as ProviderKey;
    const providerMeta = getProvider(provider);
    const apiKey = provider === "gemini" ? keys.gemini
      : provider === "openai" ? keys.openai
      : provider === "anthropic" ? keys.anthropic
      : undefined;

    if (provider !== "ollama" && !apiKey) {
      showError(`Please add your ${providerMeta.name} API key in Settings.`);
      return;
    }
    if (!prompt.trim()) {
      showError("Describe the playlist you want.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/llm-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider,
          model: keys.selectedModel || providerMeta.defaultModel,
          apiKey,
          baseUrl: provider === "ollama" ? keys.ollamaBaseUrl : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUsedModel(data.model ? `${data.provider ?? provider}/${data.model}` : "");
      const entries: SongEntry[] = data.songs.map((s: { title: string; artist: string }) => ({
        id: nanoid(),
        title: s.title,
        artist: s.artist,
        status: "idle",
      }));
      setSongs(entries);
      setStep("review");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to generate playlist");
    } finally {
      setLoading(false);
    }
  }

  async function searchAllSongs(list: SongEntry[]) {
    if (!keys.youtube) {
      showError("Please add your YouTube API key in Settings to search videos.");
      return;
    }
    setSearching(true);

    const updated = [...list];
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
                apiKey: keys.youtube,
              }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const first = data.results?.[0];
            updated[idx] = first
              ? { ...updated[idx], videoId: first.videoId, videoTitle: first.title, status: "found" }
              : { ...updated[idx], status: "not_found" };
          } catch {
            updated[idx] = { ...updated[idx], status: "not_found" };
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

  function reset() {
    setSongs([]);
    setStep("input");
    setUsedModel("");
  }

  const activeProviderMeta = getProvider((keys.selectedProvider || "gemini") as ProviderKey);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {step === "input" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Sparkles className="w-6 h-6 text-yellow-400" />
              AI Playlist Generator
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
              Describe your vibe and let Gemini curate the perfect playlist.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Moods</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => appendChip(chip)}
                  className="px-3 py-1 rounded-full text-xs border border-[var(--border-2)] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors bg-transparent cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => appendChip(chip)}
                  className="px-3 py-1 rounded-full text-xs border border-[var(--border-2)] text-[var(--fg-muted)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] transition-colors bg-transparent cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Describe your playlist</label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. 90s grunge road trip, energetic workout metal, chill lo-fi for studying…"
              rows={4}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generatePlaylist(); }}
            />
            <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>Tip: mention artists, era, mood, activity for best results. ⌘+Enter to generate.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--fg-faint)' }}>Examples</label>
            <div className="space-y-1">
              {EXAMPLE_PROMPTS.map(ex => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--fg-muted)' }}
                >
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <span className="text-base leading-none">{activeProviderMeta.icon}</span>
            <span style={{ color: 'var(--fg-muted)' }}>{activeProviderMeta.name}</span>
            <span className="mx-1" style={{ color: 'var(--fg-faint)' }}>·</span>
            <span style={{ color: 'var(--fg)' }}>{keys.selectedModel || activeProviderMeta.defaultModel}</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--fg-faint)' }}>Change in Settings →</span>
          </div>

          <Button
            variant="primary"
            className="w-full h-11 text-base"
            onClick={generatePlaylist}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {loading ? "Generating…" : "Generate Playlist"}
          </Button>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={reset} className="text-sm flex items-center gap-1 transition-opacity opacity-60 hover:opacity-100 cursor-pointer" style={{ color: 'var(--fg)' }}>
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{songs.length} Songs Generated</h2>
              {usedModel && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>via {usedModel}</p>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => searchAllSongs(songs)}
              disabled={searching || !keys.youtube}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {searching ? "Searching…" : "Search YouTube"}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="w-4 h-4" />
              New
            </Button>
          </div>

          <PlaylistOutput songs={songs} title="AI Generated Playlist" />

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--fg-faint)' }}>
              Song List
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {songs.map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={i}
                  onManualSet={handleManualSet}
                  onRemove={handleRemove}
                  showGrip
                />
              ))}
            </div>
          </div>

          <div className="pt-2 text-xs text-center" style={{ color: 'var(--fg-faint)' }}>
            Click ✎ on any row to manually set a YouTube URL or video ID
          </div>
        </div>
      )}
    </div>
  );
}
