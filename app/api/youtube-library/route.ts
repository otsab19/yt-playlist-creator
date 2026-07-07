import { NextRequest, NextResponse } from "next/server";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

interface YTVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

async function ytFetch(path: string, accessToken: string): Promise<Response> {
  return fetch(`${YT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function GET(req: NextRequest) {
  const accessToken = req.nextUrl.searchParams.get("accessToken");
  const type = req.nextUrl.searchParams.get("type") || "liked"; // liked | playlists | playlist-items
  const playlistId = req.nextUrl.searchParams.get("playlistId");
  const pageToken = req.nextUrl.searchParams.get("pageToken") || "";

  if (!accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    if (type === "liked") {
      // Fetch liked videos (special playlist "LL")
      const url = `/playlistItems?part=snippet&playlistId=LL&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await ytFetch(url, accessToken);
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      const videos: YTVideo[] = (data.items || [])
        .filter((item: { snippet: { resourceId: { kind: string } } }) => item.snippet.resourceId.kind === "youtube#video")
        .map((item: { snippet: { resourceId: { videoId: string }; title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } } }) => ({
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
        }));

      return NextResponse.json({
        videos,
        nextPageToken: data.nextPageToken || null,
        totalResults: data.pageInfo?.totalResults || 0,
      });
    }

    if (type === "playlists") {
      const url = `/playlists?part=snippet,contentDetails&mine=true&maxResults=25${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await ytFetch(url, accessToken);
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      const playlists = (data.items || []).map((item: {
        id: string;
        snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
        contentDetails: { itemCount: number };
      }) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
        itemCount: item.contentDetails.itemCount,
      }));

      return NextResponse.json({ playlists, nextPageToken: data.nextPageToken || null });
    }

    if (type === "playlist-items" && playlistId) {
      const url = `/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await ytFetch(url, accessToken);
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      const videos: YTVideo[] = (data.items || [])
        .filter((item: { snippet: { resourceId: { kind: string } } }) => item.snippet.resourceId.kind === "youtube#video")
        .map((item: { snippet: { resourceId: { videoId: string }; title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } } }) => ({
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
        }));

      return NextResponse.json({
        videos,
        nextPageToken: data.nextPageToken || null,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch library";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
