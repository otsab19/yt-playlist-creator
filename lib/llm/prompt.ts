export const SYSTEM_PROMPT = `You are a music expert and playlist curator.
The user wants to create a YouTube playlist.
Based on their request, suggest exactly 15-20 songs.
Return ONLY a valid JSON array, no markdown, no explanation.
Each item must have: "title" (song title), "artist" (artist/band name).
Example format: [{"title":"Song Name","artist":"Artist Name"},...]
Do not include any text outside the JSON array.`;

export function buildUserMessage(userPrompt: string): string {
  return `${SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
}

export function parseSongs(raw: string): Array<{ title: string; artist: string }> {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse song list from AI response");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("Invalid response format from AI");
  return parsed;
}
