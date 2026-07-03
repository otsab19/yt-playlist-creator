import { NextRequest, NextResponse } from "next/server";

async function ytFetch(path: string, accessToken: string, body?: object) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message ?? `YouTube API error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function POST(req: NextRequest) {
  const { accessToken, name, videoIds } = await req.json();

  if (!accessToken) return NextResponse.json({ error: "Not authenticated — please sign in again." }, { status: 401 });
  if (!name?.trim()) return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
  if (!Array.isArray(videoIds) || !videoIds.length) return NextResponse.json({ error: "No found videos to save. Search YouTube first." }, { status: 400 });

  try {
    // 1. Create the playlist
    const playlist = await ytFetch("/playlists?part=snippet,status", accessToken, {
      snippet: { title: name.trim(), description: "Created with PlaylistAI" },
      status: { privacyStatus: "private" },
    });

    const playlistId: string = playlist.id;

    // 2. Insert all videos in parallel (position omitted — YouTube sequences them on its end)
    const results = await Promise.allSettled(
      videoIds.map((videoId: string) =>
        ytFetch("/playlistItems?part=snippet", accessToken, {
          snippet: {
            playlistId,
            resourceId: { kind: "youtube#video", videoId },
          },
        })
      )
    );

    const skipped = results.filter(r => r.status === "rejected").length;
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    return NextResponse.json({ playlistId, playlistUrl, added: videoIds.length - skipped, skipped });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save playlist";
    console.error("[youtube-save-playlist]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
