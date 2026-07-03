import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMConfig, SongSuggestion } from "@/lib/llm/types";
import { SYSTEM_PROMPT, parseSongs } from "@/lib/llm/prompt";

export class GeminiProvider implements LLMProvider {
  readonly id = "gemini" as const;
  readonly name = "Google Gemini";

  async generatePlaylist(prompt: string, config: LLMConfig): Promise<SongSuggestion[]> {
    if (!config.apiKey) throw new Error("Gemini API key is required");

    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nUser request: ${prompt}`
    );
    const text = result.response.text().trim();
    return parseSongs(text);
  }
}
