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
  return res.json();
}

export async function POST(req: NextRequest) {
  const { accessToken, name, videoIds } = await req.json();

  if (!accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!name?.trim()) return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
  if (!Array.isArray(videoIds) || !videoIds.length) return NextResponse.json({ error: "No videos to save" }, { status: 400 });

  // 1. Create the playlist
  const playlist = await ytFetch("/playlists?part=snippet,status", accessToken, {
    snippet: { title: name.trim(), description: "Created with PlaylistAI" },
    status: { privacyStatus: "private" },
  });

  if (playlist.error) {
    return NextResponse.json({ error: playlist.error.message ?? "Failed to create playlist" }, { status: 400 });
  }

  const playlistId: string = playlist.id;

  // 2. Insert videos sequentially (YouTube API requires sequential inserts)
  const errors: string[] = [];
  for (let i = 0; i < videoIds.length; i++) {
    const result = await ytFetch("/playlistItems?part=snippet", accessToken, {
      snippet: {
        playlistId,
        position: i,
        resourceId: { kind: "youtube#video", videoId: videoIds[i] },
      },
    });
    if (result.error) errors.push(videoIds[i]);
  }

  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  return NextResponse.json({ playlistId, playlistUrl, skipped: errors.length });
}
