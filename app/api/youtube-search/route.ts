import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query, apiKey, accessToken } = await req.json();

  if (!apiKey && !accessToken) {
    return NextResponse.json({ error: "Sign in with Google or add a YouTube API key in Settings to search." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const baseUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5`;
  const url = apiKey ? `${baseUrl}&key=${apiKey}` : baseUrl;

  try {
    const res = await fetch(url, accessToken ? {
      headers: { Authorization: `Bearer ${accessToken}` },
    } : undefined);
    const data = await res.json();

    if (data.error) {
      console.error("[youtube-search] API error:", JSON.stringify(data.error));
      const msg = data.error.message ?? JSON.stringify(data.error);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!data.items) {
      console.error("[youtube-search] Unexpected response:", JSON.stringify(data));
      return NextResponse.json({ error: `Unexpected YouTube response: ${JSON.stringify(data)}` }, { status: 500 });
    }

    const results = (data.items || []).map((item: {
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; thumbnails: { default: { url: string } } };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url,
    }));

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
