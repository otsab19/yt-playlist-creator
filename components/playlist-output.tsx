"use client";
import React, { useState, useRef, useEffect } from "react";
import { Copy, ExternalLink, Check, ListMusic, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildYouTubePlaylistUrl } from "@/lib/utils";
import type { SongEntry } from "@/lib/types";

interface PlaylistOutputProps {
  songs: SongEntry[];
  title?: string;
  onSaveToYouTube?: (name: string) => void;
  savingToYouTube?: boolean;
}

export function PlaylistOutput({
  songs,
  title = "Playlist",
  onSaveToYouTube,
  savingToYouTube = false,
}: PlaylistOutputProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(title);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(title); }, [title]);

  const foundSongs = songs.filter(s => s.videoId && (s.status === "found" || s.status === "manual"));
  const url = buildYouTubePlaylistUrl(foundSongs.map(s => s.videoId!));

  if (!foundSongs.length) return null;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    setEditing(false);
    if (!name.trim()) setName(title);
  }

  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <ListMusic className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-muted)' }} />

        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") commitEdit(); }}
            className="text-sm font-semibold flex-1 min-w-0 bg-transparent outline-none border-b"
            style={{ color: 'var(--fg)', borderColor: 'var(--accent)' }}
          />
        ) : (
          <button
            onClick={startEdit}
            className="group flex items-center gap-1.5 min-w-0 text-left"
            title="Click to rename"
          >
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{name}</span>
            <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--fg-muted)' }} />
          </button>
        )}

        <span className="ml-auto text-xs shrink-0" style={{ color: 'var(--fg-muted)' }}>
          {foundSongs.length} of {songs.length} songs
        </span>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 h-9 rounded-lg px-3 text-xs font-mono outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--accent)' }}
        />
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0" title="Copy URL">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
        <Button variant="destructive" size="sm" asChild className="shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
        </Button>
      </div>

      {onSaveToYouTube && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => onSaveToYouTube(name)}
            disabled={savingToYouTube}
          >
            {savingToYouTube ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
                Saving to YouTube…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Save to YouTube as &quot;{name}&quot;
              </>
            )}
          </Button>
        </div>
      )}

      {songs.length !== foundSongs.length && (
        <p className="text-xs mt-2" style={{ color: 'var(--fg-faint)' }}>
          {songs.length - foundSongs.length} song(s) not found — manually add them or search again.
        </p>
      )}
    </div>
  );
}
