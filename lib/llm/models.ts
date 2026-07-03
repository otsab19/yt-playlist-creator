import type { ProviderKey } from "@/lib/llm/types";

export interface ModelOption {
  value: string;
  label: string;
}

export interface ProviderMeta {
  key: ProviderKey;
  name: string;
  icon: string;
  color: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyLink?: string;
  keyLinkLabel?: string;
  needsBaseUrl?: boolean;
  baseUrlDefault?: string;
  models: ModelOption[];
  defaultModel: string;
}

export const PROVIDER_REGISTRY: ProviderMeta[] = [
  {
    key: "gemini",
    name: "Google Gemini",
    icon: "✦",
    color: "#4285F4",
    keyLabel: "Gemini API Key",
    keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/app/apikey",
    keyLinkLabel: "Get free key",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash" },
      { value: "gemini-1.5-flash-8b-latest", label: "Gemini 1.5 Flash 8B" },
    ],
    defaultModel: "gemini-2.0-flash",
  },
  {
    key: "openai",
    name: "OpenAI",
    icon: "⬡",
    color: "#10A37F",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-...",
    keyLink: "https://platform.openai.com/api-keys",
    keyLinkLabel: "Get API key",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    defaultModel: "gpt-4o-mini",
  },
  {
    key: "anthropic",
    name: "Anthropic Claude",
    icon: "◆",
    color: "#D4A574",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-...",
    keyLink: "https://console.anthropic.com/settings/keys",
    keyLinkLabel: "Get API key",
    models: [
      { value: "claude-opus-4-5", label: "Claude Opus 4.5" },
      { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { value: "claude-haiku-3-5", label: "Claude Haiku 3.5" },
    ],
    defaultModel: "claude-haiku-3-5",
  },
  {
    key: "ollama",
    name: "Ollama (local)",
    icon: "🦙",
    color: "#888",
    keyLabel: "Base URL",
    keyPlaceholder: "http://localhost:11434/v1",
    needsBaseUrl: true,
    baseUrlDefault: "http://localhost:11434/v1",
    models: [
      { value: "llama3.2", label: "Llama 3.2" },
      { value: "llama3.1", label: "Llama 3.1" },
      { value: "mistral", label: "Mistral" },
      { value: "mixtral", label: "Mixtral" },
      { value: "gemma3", label: "Gemma 3" },
      { value: "qwen2.5", label: "Qwen 2.5" },
      { value: "phi4", label: "Phi-4" },
    ],
    defaultModel: "llama3.2",
  },
];

export function getProvider(key: ProviderKey): ProviderMeta {
  return PROVIDER_REGISTRY.find(p => p.key === key)!;
}
