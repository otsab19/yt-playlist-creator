import type { LLMProvider, LLMConfig, ProviderKey } from "@/lib/llm/types";
import { GeminiProvider } from "@/lib/llm/providers/gemini";
import { OpenAIProvider } from "@/lib/llm/providers/openai";
import { AnthropicProvider } from "@/lib/llm/providers/anthropic";
import { OllamaProvider } from "@/lib/llm/providers/ollama";

const PROVIDERS: Record<ProviderKey, LLMProvider> = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  ollama: new OllamaProvider(),
};

export function createProvider(provider: ProviderKey): LLMProvider {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);
  return p;
}

export function generatePlaylist(prompt: string, config: LLMConfig) {
  const provider = createProvider(config.provider);
  return provider.generatePlaylist(prompt, config);
}
