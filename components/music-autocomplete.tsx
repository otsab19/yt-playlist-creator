"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, User, Music, Hash, Loader2 } from "lucide-react";

export type SearchType = "artist" | "track" | "tag";

export interface MusicResult {
  name: string;
  artist?: string;
  listeners?: number;
  count?: number;
  image?: string | null;
  type: SearchType;
}

interface Props {
  onSelect: (result: MusicResult) => void;
  placeholder?: string;
  searchTypes?: SearchType[];
  className?: string;
}

const TYPE_ICONS: Record<SearchType, React.ReactNode> = {
  artist: <User className="w-3.5 h-3.5" />,
  track: <Music className="w-3.5 h-3.5" />,
  tag: <Hash className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<SearchType, string> = {
  artist: "Artist",
  track: "Song",
  tag: "Genre",
};

export function MusicAutocomplete({
  onSelect,
  placeholder = "Search artists, songs, genres…",
  searchTypes = ["artist", "track", "tag"],
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<SearchType>(searchTypes[0] ?? "artist");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, type: SearchType) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/music-search?q=${encodeURIComponent(q)}&type=${type}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(query, activeType), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeType, doSearch]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: MusicResult) {
    onSelect(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function formatSub(r: MusicResult) {
    if (r.type === "track" && r.artist) return r.artist;
    if (r.listeners) return `${(r.listeners / 1000).toFixed(0)}k listeners`;
    if (r.count) return `${r.count.toLocaleString()} tagged`;
    return null;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className="flex items-center gap-2 h-10 rounded-xl px-3 transition-colors"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
      >
        {loading
          ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: "var(--fg-faint)" }} />
          : <Search className="w-4 h-4 shrink-0" style={{ color: "var(--fg-faint)" }} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: "var(--fg)" }}
        />
      </div>

      {/* Type tabs */}
      {searchTypes.length > 1 && open && (
        <div className="absolute top-12 left-0 right-0 z-50">
          <div
            className="rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {searchTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                  style={activeType === t
                    ? { color: "var(--accent)", borderBottom: "2px solid var(--accent)" }
                    : { color: "var(--fg-muted)" }
                  }
                >
                  {TYPE_ICONS[t]}
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto">
              {results.length === 0 && query.trim() && !loading && (
                <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-faint)" }}>
                  No results for &quot;{query}&quot;
                </p>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.name}-${i}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer text-left hover:bg-[var(--bg-input)]"
                >
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--bg-input)" }}>
                      {TYPE_ICONS[r.type]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--fg)" }}>{r.name}</p>
                    {formatSub(r) && (
                      <p className="text-xs truncate" style={{ color: "var(--fg-muted)" }}>{formatSub(r)}</p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ background: "var(--bg-input)", color: "var(--fg-faint)" }}>
                    {TYPE_LABELS[r.type]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
