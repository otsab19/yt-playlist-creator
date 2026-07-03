import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildYouTubePlaylistUrl(videoIds: string[]): string {
  if (!videoIds.length) return "";
  return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`;
}

export function extractVideoId(raw: string): string | null {
  raw = raw.trim();
  try {
    const u = new URL(raw);
    const v = u.searchParams.get("v");
    if (v) return v;
    const path = u.pathname.split("/").pop();
    if (path && /^[A-Za-z0-9_\-]{11}$/.test(path)) return path;
  } catch {
    // not a URL
  }
  if (/^[A-Za-z0-9_\-]{11}$/.test(raw)) return raw;
  return null;
}
