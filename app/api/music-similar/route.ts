import { NextRequest, NextResponse } from "next/server";

const LASTFM_KEY = process.env.LASTFM_API_KEY || "";
const BASE = "https://ws.audioscrobbler.com/2.0/";

async function lastfm(method: string, params: Record<string, string>) {
  const url = new URL(BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", LASTFM_KEY);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist")?.trim();
  const tag = req.nextUrl.searchParams.get("tag")?.trim();

  if (!LASTFM_KEY) {
    return NextResponse.json({ error: "LASTFM_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Similar artists
    if (artist) {
      const data = await lastfm("artist.getSimilar", { artist, limit: "12" });
      const items = data?.similarartists?.artist || [];
      return NextResponse.json({
        similar: items.map((a: { name: string; match: string; image: { "#text": string; size: string }[] }) => ({
          name: a.name,
          match: parseFloat(a.match || "0"),
          image: a.image?.find((i: { size: string }) => i.size === "medium")?.["#text"] || null,
        })),
      });
    }

    // Top artists for a genre/tag
    if (tag) {
      const data = await lastfm("tag.getTopArtists", { tag, limit: "12" });
      const items = data?.topartists?.artist || [];
      return NextResponse.json({
        artists: items.map((a: { name: string; image: { "#text": string; size: string }[] }) => ({
          name: a.name,
          image: a.image?.find((i: { size: string }) => i.size === "medium")?.["#text"] || null,
        })),
      });
    }

    return NextResponse.json({ error: "Provide artist or tag param" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch similar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
