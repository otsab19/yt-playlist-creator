import OpenAI from "openai";
import type { LLMProvider, LLMConfig, SongSuggestion } from "@/lib/llm/types";
import { SYSTEM_PROMPT, parseSongs } from "@/lib/llm/prompt";

export class OllamaProvider implements LLMProvider {
  readonly id = "ollama" as const;
  readonly name = "Ollama (local)";

  async generatePlaylist(prompt: string, config: LLMConfig): Promise<SongSuggestion[]> {
    const baseUrl = config.baseUrl ?? "http://localhost:11434/v1";

    // Ollama exposes an OpenAI-compatible /v1 endpoint
    const client = new OpenAI({
      apiKey: "ollama",
      baseURL: baseUrl,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    return parseSongs(text);
  }
}
