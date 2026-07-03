"use client";
import React, { useState } from "react";
import { Mic2, Wand2, RefreshCw, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SongRow } from "@/components/song-row";
import { PlaylistOutput } from "@/components/playlist-output";
import { useSession, signIn } from "next-auth/react";
import { SignInBanner } from "@/components/sign-in-banner";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast";
import type { SongEntry } from "@/lib/types";

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function parseSetlist(raw: string, defaultArtist: string): SongEntry[] {
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.match(/^[^a-zA-Z0-9]/))
    .filter(line => !line.toLowerCase().startsWith("set") && line.length > 2)
    .map(line => ({
      id: nanoid(),
      title: line.replace(/^\d+[\.\)]\s*/, "").trim(),
      artist: defaultArtist || undefined,
      status: "idle" as const,
    }));
}

const PANTERA_SETLIST = `A New Level
Mouth for War
Strength Beyond Strength
Becoming
I'm Broken
5 Minutes Alone
This Love
Fucking Hostile
Walk
Domination / Hollow
Cowboys From Hell`;

const METALLICA_SETLIST = `Creeping Death
For Whom the Bell Tolls
Moth Into Flame
King Nothing
Lux Æterna
The Unforgiven
Fuel
Fade to Black
Wherever I May Roam
Nothing Else Matters
Sad but True
One
Seek & Destroy
Master of Puppets
Enter Sandman`;

interface SetlistGroup {
  id: string;
  artist: string;
  rawText: string;
  songs: SongEntry[];
}

export default function SetlistPage() {
  const { keys } = useSettings();
  const { error: showError, success: showSuccess } = useToast();
  const { data: session } = useSession();
  const [savingToYT, setSavingToYT] = useState<string | null>(null);
  const [groups, setGroups] = useState<SetlistGroup[]>([
    { id: nanoid(), artist: "Pantera", rawText: PANTERA_SETLIST, songs: [] },
    { id: nanoid(), artist: "Metallica", rawText: METALLICA_SETLIST, songs: [] },
  ]);
  const [searching, setSearching] = useState(false);
  const [parsed, setParsed] = useState(false);

  function addGroup() {
    setGroups(prev => [...prev, { id: nanoid(), artist: "", rawText: "", songs: [] }]);
  }

  function removeGroup(id: string) {
    setGroups(prev => prev.filter(g => g.id !== id));
  }

  function updateGroup(id: string, field: "artist" | "rawText", value: string) {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  }

  function parseAll() {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        songs: parseSetlist(g.rawText, g.artist),
      }))
    );
    setParsed(true);
  }

  async function searchAll() {
    if (!keys.youtube && !session?.accessToken) {
      showError("Sign in with Google or add a YouTube API key in Settings.");
      return;
    }
    setSearching(true);
    let shownError = false;

    const allGroups = groups.map(g => ({ ...g, songs: [...g.songs] }));

    for (let gi = 0; gi < allGroups.length; gi++) {
      const group = allGroups[gi];
      const BATCH = 3;

      for (let i = 0; i < group.songs.length; i += BATCH) {
        const batch = group.songs.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (song, bi) => {
            const idx = i + bi;
            group.songs[idx] = { ...group.songs[idx], status: "searching" };
            setGroups(allGroups.map(g => ({ ...g })));

            try {
              const res = await fetch("/api/youtube-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: `${group.artist || ""} ${song.title} official`,
                  apiKey: keys.youtube || undefined,
                  accessToken: session?.accessToken || undefined,
                }),
              });
              const data = await res.json();
              if (data.error) throw new Error(data.error);
              const first = data.results?.[0];
              group.songs[idx] = first
                ? { ...group.songs[idx], videoId: first.videoId, videoTitle: first.title, status: "found" }
                : { ...group.songs[idx], status: "not_found" };
            } catch (e: unknown) {
              group.songs[idx] = { ...group.songs[idx], status: "not_found" };
              if (!shownError) {
                shownError = true;
                showError(e instanceof Error ? e.message : "YouTube search failed");
              }
            }
            setGroups(allGroups.map(g => ({ ...g })));
          })
        );
      }
    }
    setSearching(false);
  }

  function handleManualSet(groupId: string, songId: string, videoId: string, videoTitle: string) {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, songs: g.songs.map(s => s.id === songId ? { ...s, videoId, videoTitle, status: "manual" } : s) }
          : g
      )
    );
  }

  function handleRemoveSong(groupId: string, songId: string) {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, songs: g.songs.filter(s => s.id !== songId) } : g
      )
    );
  }

  const allSongs = groups.flatMap(g => g.songs);

  async function saveGroupToYouTube(groupId: string, name: string) {
    if (!session?.accessToken) { signIn("google"); return; }
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const videoIds = group.songs.filter(s => s.videoId && (s.status === "found" || s.status === "manual")).map(s => s.videoId!);
    setSavingToYT(groupId);
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
      setSavingToYT(null);
    }
  }

  async function saveAllToYouTube(name: string) {
    if (!session?.accessToken) { signIn("google"); return; }
    const videoIds = allSongs.filter(s => s.videoId && (s.status === "found" || s.status === "manual")).map(s => s.videoId!);
    setSavingToYT("all");
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
      setSavingToYT(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <SignInBanner />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <Mic2 className="w-6 h-6 text-orange-400" />
          Concert Setlist Playlist
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Paste a concert setlist and build a YouTube playlist from it.
        </p>
      </div>


      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={group.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <Input
                value={group.artist}
                onChange={e => updateGroup(group.id, "artist", e.target.value)}
                placeholder="Artist / Band name"
                className="h-8 text-sm flex-1 max-w-xs"
                disabled={parsed}
              />
              <span className="text-xs ml-auto" style={{ color: 'var(--fg-faint)' }}>Group {gi + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 hover:text-red-400"
                onClick={() => removeGroup(group.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {!parsed ? (
              <div className="p-4">
                <Textarea
                  value={group.rawText}
                  onChange={e => updateGroup(group.id, "rawText", e.target.value)}
                  placeholder={"Paste setlist here, one song per line:\nSong Title 1\nSong Title 2\n..."}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {group.songs.length === 0 ? (
                  <p className="px-4 py-3 text-xs" style={{ color: 'var(--fg-faint)' }}>No songs parsed from this setlist.</p>
                ) : (
                  group.songs.map((song, i) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={i}
                      onManualSet={(sid, vid, vtitle) => handleManualSet(group.id, sid, vid, vtitle)}
                      onRemove={(sid) => handleRemoveSong(group.id, sid)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        {!parsed && (
          <Button variant="outline" size="sm" onClick={addGroup} className="w-full">
            <Plus className="w-4 h-4" />
            Add Another Band / Set
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {!parsed ? (
          <Button variant="primary" className="h-10" onClick={parseAll}>
            <Wand2 className="w-4 h-4" />
            Parse Setlists
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              className="h-10"
              onClick={searchAll}
              disabled={searching}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {searching ? "Searching…" : "Search All on YouTube"}
            </Button>
            {!keys.youtube && !session?.accessToken && (
              <p className="text-xs self-center" style={{ color: 'var(--fg-faint)' }}>
                ⚠ Sign in or add YouTube API key in Settings
              </p>
            )}
            <Button variant="outline" className="h-10" onClick={() => { setParsed(false); }}>
              ← Edit Setlists
            </Button>
          </>
        )}
      </div>

      {parsed && allSongs.length > 0 && (
        <div className="space-y-3">
          {groups.map(group => (
            group.songs.length > 0 && (
              <PlaylistOutput
                key={group.id}
                songs={group.songs}
                title={`${group.artist || "Band"} Playlist`}
                onSaveToYouTube={(name) => saveGroupToYouTube(group.id, name)}
                savingToYouTube={savingToYT === group.id}
              />
            )
          ))}
          {groups.length > 1 && (
            <PlaylistOutput
              songs={allSongs}
              title="Full Night Playlist (All Bands)"
              onSaveToYouTube={saveAllToYouTube}
              savingToYouTube={savingToYT === "all"}
            />
          )}
        </div>
      )}
    </div>
  );
}
