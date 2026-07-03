export type ProviderKey = "gemini" | "openai" | "anthropic" | "ollama";

export interface LLMConfig {
  provider: ProviderKey;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface SongSuggestion {
  title: string;
  artist: string;
}

export interface LLMProvider {
  readonly id: ProviderKey;
  readonly name: string;
  generatePlaylist(prompt: string, config: LLMConfig): Promise<SongSuggestion[]>;
}
