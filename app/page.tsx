"use client";
import React, { useState } from "react";
import {
  Sparkles,
  Wand2,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SongRow } from "@/components/song-row";
import { PlaylistOutput } from "@/components/playlist-output";
import { useSettings } from "@/components/settings-context";
import type { SongEntry } from "@/lib/types";

const GENRE_CHIPS = [
  "Heavy Metal", "Classic Rock", "Hip-Hop", "Indie", "Pop", "Jazz",
  "Electronic", "R&B", "Country", "Punk", "Blues", "Reggae",
];

const MOOD_CHIPS = [
  "Energetic", "Chill", "Sad", "Happy", "Focus", "Party",
  "Workout", "Late Night", "Road Trip", "Romantic",
];

const GEMINI_MODELS = [
  { value: "auto", label: "Auto (fallback chain)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash (latest)" },
  { value: "gemini-1.5-flash-8b-latest", label: "Gemini 1.5 Flash 8B (latest)" },
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
  const [prompt, setPrompt] = useState("");
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"input" | "review">("input");
  const [model, setModel] = useState("auto");
  const [usedModel, setUsedModel] = useState("");

  function appendChip(chip: string) {
    setPrompt(p => p ? `${p}, ${chip}` : chip);
  }

  async function generatePlaylist() {
    if (!keys.gemini) {
      setError("Please add your Gemini API key in Settings (top right).");
      return;
    }
    if (!prompt.trim()) {
      setError("Describe the playlist you want.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/llm-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, apiKey: keys.gemini, model: model === "auto" ? undefined : model }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUsedModel(data.model || "");
      const entries: SongEntry[] = data.songs.map((s: { title: string; artist: string }) => ({
        id: nanoid(),
        title: s.title,
        artist: s.artist,
        status: "idle",
      }));
      setSongs(entries);
      setStep("review");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate playlist");
    } finally {
      setLoading(false);
    }
  }

  async function searchAllSongs(list: SongEntry[]) {
    if (!keys.youtube) {
      setError("Please add your YouTube API key in Settings to search videos.");
      return;
    }
    setSearching(true);
    setError("");

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
    setError("");
    setUsedModel("");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {step === "input" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              AI Playlist Generator
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Describe your vibe and let Gemini curate the perfect playlist.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">Moods</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => appendChip(chip)}
                  className="px-3 py-1 rounded-full text-xs border border-neutral-700 text-neutral-400 hover:border-blue-500 hover:text-blue-300 transition-colors bg-transparent cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => appendChip(chip)}
                  className="px-3 py-1 rounded-full text-xs border border-neutral-700 text-neutral-400 hover:border-purple-500 hover:text-purple-300 transition-colors bg-transparent cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">Describe your playlist</label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. 90s grunge road trip, energetic workout metal, chill lo-fi for studying…"
              rows={4}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generatePlaylist(); }}
            />
            <p className="text-xs text-neutral-600">Tip: mention artists, era, mood, activity for best results. ⌘+Enter to generate.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-500">Examples</label>
            <div className="space-y-1">
              {EXAMPLE_PROMPTS.map(ex => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="w-full text-left text-xs text-neutral-500 hover:text-neutral-200 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Gemini model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full h-9 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus:border-neutral-500 cursor-pointer"
              >
                {GEMINI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
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
            <button onClick={reset} className="text-neutral-500 hover:text-neutral-200 text-sm flex items-center gap-1 transition-colors cursor-pointer">
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">{songs.length} Songs Generated</h2>
              {usedModel && <p className="text-xs text-neutral-500 mt-0.5">via {usedModel}</p>}
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

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <PlaylistOutput songs={songs} title="AI Generated Playlist" />

          <div className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-900/30">
            <div className="px-3 py-2 border-b border-neutral-800 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Song List
            </div>
            <div className="divide-y divide-neutral-800/50">
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

          <div className="pt-2 text-xs text-neutral-600 text-center">
            Click ✎ on any row to manually set a YouTube URL or video ID
          </div>
        </div>
      )}
    </div>
  );
}
