import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMConfig, SongSuggestion } from "@/lib/llm/types";
import { SYSTEM_PROMPT, parseSongs } from "@/lib/llm/prompt";

export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic" as const;
  readonly name = "Anthropic Claude";

  async generatePlaylist(prompt: string, config: LLMConfig): Promise<SongSuggestion[]> {
    if (!config.apiKey) throw new Error("Anthropic API key is required");

    const client = new Anthropic({ apiKey: config.apiKey });
    const message = await client.messages.create({
      model: config.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const text = block.type === "text" ? block.text.trim() : "";
    return parseSongs(text);
  }
}
