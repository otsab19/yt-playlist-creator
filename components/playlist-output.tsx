"use client";
import React, { useState } from "react";
import { Copy, ExternalLink, Check, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildYouTubePlaylistUrl } from "@/lib/utils";
import type { SongEntry } from "@/lib/types";

interface PlaylistOutputProps {
  songs: SongEntry[];
  title?: string;
}

export function PlaylistOutput({ songs, title = "Playlist" }: PlaylistOutputProps) {
  const [copied, setCopied] = useState(false);

  const foundSongs = songs.filter(s => s.videoId && (s.status === "found" || s.status === "manual"));
  const url = buildYouTubePlaylistUrl(foundSongs.map(s => s.videoId!));

  if (!foundSongs.length) return null;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListMusic className="w-4 h-4 text-neutral-400" />
        <span className="text-sm font-semibold text-neutral-200">{title}</span>
        <span className="ml-auto text-xs text-neutral-500">{foundSongs.length} of {songs.length} songs</span>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 h-9 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-xs text-blue-400 font-mono outline-none"
        />
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
        <Button variant="destructive" size="sm" asChild className="shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
        </Button>
      </div>

      {songs.length !== foundSongs.length && (
        <p className="text-xs text-neutral-600 mt-2">
          {songs.length - foundSongs.length} song(s) not found — manually add them or search again.
        </p>
      )}
    </div>
  );
}
