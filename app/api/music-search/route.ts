import { NextRequest, NextResponse } from "next/server";

const LASTFM_KEY = process.env.LASTFM_API_KEY || "";
const BASE = "https://ws.audioscrobbler.com/2.0/";

async function lastfm(method: string, params: Record<string, string>) {
  const url = new URL(BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", LASTFM_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") || "artist"; // artist | track | tag

  if (!LASTFM_KEY) {
    return NextResponse.json({ error: "LASTFM_API_KEY not configured" }, { status: 500 });
  }
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (type === "artist") {
      const data = await lastfm("artist.search", { artist: q });
      const items = data?.results?.artistmatches?.artist || [];
      return NextResponse.json({
        results: items.map((a: { name: string; listeners: string; image: { "#text": string; size: string }[] }) => ({
          name: a.name,
          listeners: parseInt(a.listeners || "0"),
          image: a.image?.find((i: { size: string }) => i.size === "medium")?.["#text"] || null,
          type: "artist",
        })),
      });
    }

    if (type === "track") {
      const data = await lastfm("track.search", { track: q });
      const items = data?.results?.trackmatches?.track || [];
      return NextResponse.json({
        results: items.map((t: { name: string; artist: string; listeners: string }) => ({
          name: t.name,
          artist: t.artist,
          listeners: parseInt(t.listeners || "0"),
          type: "track",
        })),
      });
    }

    if (type === "tag") {
      const data = await lastfm("tag.search", { tag: q });
      const items = data?.results?.tagmatches?.tag || [];
      return NextResponse.json({
        results: items.map((t: { name: string; count: string }) => ({
          name: t.name,
          count: parseInt(t.count || "0"),
          type: "tag",
        })),
      });
    }

    return NextResponse.json({ results: [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Music search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
