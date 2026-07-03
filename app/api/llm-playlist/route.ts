import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b-latest",
];

export async function POST(req: NextRequest) {
  const { prompt, apiKey, model: preferredModel } = await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const modelsToTry = preferredModel
    ? [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)]
    : FALLBACK_MODELS;

  const systemPrompt = `You are a music expert and playlist curator. 
The user wants to create a YouTube playlist.
Based on their request, suggest exactly 15-20 songs.
Return ONLY a valid JSON array, no markdown, no explanation.
Each item must have: "title" (song title), "artist" (artist/band name).
Example format: [{"title":"Song Name","artist":"Artist Name"},...]
Do not include any text outside the JSON array.`;

  let lastError = "Unknown error";
  let usedModel = "";

  for (const modelName of modelsToTry) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${prompt}`);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Could not parse song list from AI response" }, { status: 500 });
      }

      const songs = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(songs)) {
        return NextResponse.json({ error: "Invalid response format from AI" }, { status: 500 });
      }

      usedModel = modelName;
      return NextResponse.json({ songs, model: usedModel });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`Model ${modelName} failed:`, msg.slice(0, 120));
      lastError = msg;
      // Only continue fallback on quota/rate errors
      const isRetryable = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")
        || msg.includes("404") || msg.includes("not found") || msg.includes("not supported");
      if (!isRetryable) break;
    }
  }

  // Strip noisy SDK URL prefix from error message
  const cleanError = lastError.replace(/\[GoogleGenerativeAI Error\]: Error fetching from [^\]]+:\s*/g, "").trim();
  return NextResponse.json({ error: cleanError }, { status: 500 });
}
