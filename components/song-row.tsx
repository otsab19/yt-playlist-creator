"use client";
import React, { useState } from "react";
import { Pencil, Check, X, Loader2, ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractVideoId } from "@/lib/utils";
import type { SongEntry } from "@/lib/types";

interface SongRowProps {
  song: SongEntry;
  index: number;
  onManualSet: (id: string, videoId: string, videoTitle: string) => void;
  onRemove?: (id: string) => void;
  showGrip?: boolean;
}

export function SongRow({ song, index, onManualSet, onRemove, showGrip }: SongRowProps) {
  const [editing, setEditing] = useState(false);
  const [manualInput, setManualInput] = useState("");

  function applyManual() {
    const id = extractVideoId(manualInput.trim());
    if (!id) return;
    onManualSet(song.id, id, manualInput.trim());
    setEditing(false);
    setManualInput("");
  }

  const statusVariant = {
    idle: "pending",
    searching: "loading",
    found: "found",
    not_found: "error",
    manual: "manual",
  }[song.status] as "pending" | "loading" | "found" | "error" | "manual";

  const statusLabel = {
    idle: "pending",
    searching: "searching…",
    found: "found",
    not_found: "not found",
    manual: "manual",
  }[song.status];

  return (
    <div className="group">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
        {showGrip && (
          <GripVertical className="w-3.5 h-3.5 shrink-0 cursor-grab" style={{ color: 'var(--fg-faint)' }} />
        )}
        <span className="text-xs w-5 text-right shrink-0 tabular-nums" style={{ color: 'var(--fg-faint)' }}>{index + 1}</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: 'var(--fg)' }}>
            {song.title}
            {song.artist && <span style={{ color: 'var(--fg-muted)' }}> — {song.artist}</span>}
          </p>
          {song.videoTitle && song.status !== "idle" && (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--fg-faint)' }}>{song.videoTitle}</p>
          )}
        </div>

        {song.videoId && (
          <a
            href={`https://www.youtube.com/watch?v=${song.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 hover:text-blue-400 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <Badge variant={statusVariant} className="shrink-0">
          {song.status === "searching" ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : null}
          {statusLabel}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={() => setEditing(v => !v)}
        >
          <Pencil className="w-3 h-3" />
        </Button>

        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-400"
            onClick={() => onRemove(song.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {editing && (
        <div className="flex gap-2 px-3 pb-2.5">
          <Input
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="YouTube URL or video ID"
            className="text-xs h-8"
            onKeyDown={e => { if (e.key === "Enter") applyManual(); }}
            autoFocus
          />
          <Button variant="primary" size="sm" className="h-8" onClick={applyManual}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
