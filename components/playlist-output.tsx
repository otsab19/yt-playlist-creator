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
    <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <ListMusic className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--fg-muted)' }}>{foundSongs.length} of {songs.length} songs</span>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 h-9 rounded-lg px-3 text-xs font-mono outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--accent)' }}
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
        <p className="text-xs mt-2" style={{ color: 'var(--fg-faint)' }}>
          {songs.length - foundSongs.length} song(s) not found — manually add them or search again.
        </p>
      )}
    </div>
  );
}
