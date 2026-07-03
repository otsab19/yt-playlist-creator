import { NextRequest, NextResponse } from "next/server";
import { generatePlaylist } from "@/lib/llm/factory";
import type { LLMConfig, ProviderKey } from "@/lib/llm/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, provider, model, apiKey, baseUrl } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const providerKey: ProviderKey = provider ?? "gemini";

  const config: LLMConfig = {
    provider: providerKey,
    model: model ?? "",
    apiKey: apiKey ?? undefined,
    baseUrl: baseUrl ?? undefined,
  };

  try {
    const songs = await generatePlaylist(prompt, config);
    return NextResponse.json({ songs, provider: providerKey, model: config.model });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "Unknown error";
    const clean = raw
      .replace(/\[GoogleGenerativeAI Error\]: Error fetching from [^\]]+:\s*/g, "")
      .trim();
    console.error(`[llm-playlist] ${providerKey}/${config.model}:`, clean.slice(0, 200));
    return NextResponse.json({ error: clean }, { status: 500 });
  }
}
