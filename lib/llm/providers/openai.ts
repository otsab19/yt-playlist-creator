import OpenAI from "openai";
import type { LLMProvider, LLMConfig, SongSuggestion } from "@/lib/llm/types";
import { SYSTEM_PROMPT, parseSongs } from "@/lib/llm/prompt";

export class OpenAIProvider implements LLMProvider {
  readonly id = "openai" as const;
  readonly name = "OpenAI";

  async generatePlaylist(prompt: string, config: LLMConfig): Promise<SongSuggestion[]> {
    if (!config.apiKey) throw new Error("OpenAI API key is required");

    const client = new OpenAI({ apiKey: config.apiKey });
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
