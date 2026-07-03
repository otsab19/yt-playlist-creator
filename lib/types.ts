export interface SongEntry {
  id: string;
  title: string;
  artist?: string;
  videoId?: string;
  videoTitle?: string;
  status: "idle" | "searching" | "found" | "not_found" | "manual";
}

export interface ApiKeys {
  gemini: string;
  youtube: string;
}
