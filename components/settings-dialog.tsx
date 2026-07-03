"use client";
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X, Eye, EyeOff, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings, DEFAULT_KEYS } from "@/components/settings-context";
import { PROVIDER_REGISTRY, getProvider } from "@/lib/llm/models";
import type { ProviderKey } from "@/lib/llm/types";
import { cn } from "@/lib/utils";

function KeyField({
  label, value, onChange, placeholder, link, linkLabel, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; link?: string; linkLabel?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 flex items-center justify-between" style={{ color: "var(--fg-muted)" }}>
        <span>{label}</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-500 hover:text-blue-400 text-xs">
            {linkLabel} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-9"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "var(--fg-muted)" }}>
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      {hint && <p className="text-xs mt-1" style={{ color: "var(--fg-faint)" }}>{hint}</p>}
    </div>
  );
}

export function SettingsDialog() {
  const { keys, setKeys } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<typeof DEFAULT_KEYS>({ ...DEFAULT_KEYS, ...keys });
  const [activeTab, setActiveTab] = useState<"llm" | "youtube">("llm");

  function handleOpen(v: boolean) {
    if (v) {
      setDraft({ ...DEFAULT_KEYS, ...keys });
      setActiveTab("llm");
    }
    setOpen(v);
  }

  function set(field: keyof typeof draft, value: string) {
    setDraft(d => ({ ...d, [field]: value }));
  }

  function selectProvider(p: ProviderKey) {
    const meta = getProvider(p);
    setDraft(d => ({ ...d, selectedProvider: p, selectedModel: meta.defaultModel }));
  }

  function handleSave() {
    setKeys(draft);
    setOpen(false);
  }

  const selectedMeta = getProvider((draft.selectedProvider || "gemini") as ProviderKey);
  const hasLLMKey = !!(keys.gemini || keys.openai || keys.anthropic);
  const missingYouTube = !keys.youtube;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
          {missingYouTube
            ? <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" title="YouTube API key missing" />
            : hasLLMKey && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          }
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <Dialog.Title className="text-base font-semibold" style={{ color: "var(--fg)" }}>Settings</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 shrink-0">
            {(["llm", "youtube"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  activeTab === tab ? "text-white" : "opacity-50 hover:opacity-80"
                )}
                style={activeTab === tab
                  ? { background: "linear-gradient(135deg, #6366f1, #ec4899)", color: "white" }
                  : { color: "var(--fg)" }
                }
              >
                {tab === "llm" ? "AI Provider" : "YouTube"}
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {activeTab === "llm" && (
              <>
                {/* Provider picker */}
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--fg-muted)" }}>Active Provider</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PROVIDER_REGISTRY.map(p => {
                      const active = draft.selectedProvider === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => selectProvider(p.key)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                            active ? "border-indigo-500" : "hover:opacity-80"
                          )}
                          style={{
                            borderColor: active ? "#6366f1" : "var(--border)",
                            background: active ? "rgba(99,102,241,0.08)" : "var(--bg-input)",
                            color: "var(--fg)",
                          }}
                        >
                          <span className="text-base leading-none">{p.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{p.name}</p>
                          </div>
                          {active && <Check className="w-3.5 h-3.5 ml-auto text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Model picker for active provider */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>
                    Model — {selectedMeta.name}
                  </label>
                  <select
                    value={draft.selectedModel}
                    onChange={e => set("selectedModel", e.target.value)}
                    className="w-full h-9 rounded-lg px-3 text-sm outline-none cursor-pointer"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--fg)" }}
                  >
                    {selectedMeta.models.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Gemini key */}
                {draft.selectedProvider === "gemini" && (
                  <KeyField
                    label="Gemini API Key"
                    value={draft.gemini}
                    onChange={v => set("gemini", v)}
                    placeholder="AIza..."
                    link="https://aistudio.google.com/app/apikey"
                    linkLabel="Get free key"
                    hint="Free tier available — ~60 requests/min"
                  />
                )}

                {/* OpenAI key */}
                {draft.selectedProvider === "openai" && (
                  <KeyField
                    label="OpenAI API Key"
                    value={draft.openai}
                    onChange={v => set("openai", v)}
                    placeholder="sk-..."
                    link="https://platform.openai.com/api-keys"
                    linkLabel="Get API key"
                    hint="Pay-per-use — GPT-4o Mini is cheapest"
                  />
                )}

                {/* Anthropic key */}
                {draft.selectedProvider === "anthropic" && (
                  <KeyField
                    label="Anthropic API Key"
                    value={draft.anthropic}
                    onChange={v => set("anthropic", v)}
                    placeholder="sk-ant-..."
                    link="https://console.anthropic.com/settings/keys"
                    linkLabel="Get API key"
                    hint="Pay-per-use — Claude Haiku is the most affordable"
                  />
                )}

                {/* Ollama base URL */}
                {draft.selectedProvider === "ollama" && (
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>
                      Ollama Base URL
                    </label>
                    <Input
                      value={draft.ollamaBaseUrl}
                      onChange={e => set("ollamaBaseUrl", e.target.value)}
                      placeholder="http://localhost:11434/v1"
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--fg-faint)" }}>
                      Ollama must be running locally with the selected model pulled. No API key needed.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "youtube" && (
              <KeyField
                label="YouTube Data API v3 Key"
                value={draft.youtube}
                onChange={v => set("youtube", v)}
                placeholder="AIza..."
                link="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                linkLabel="Get free key"
                hint="~10,000 free units/day — enable YouTube Data API v3 in Google Cloud Console"
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <Button variant="primary" className="w-full" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
