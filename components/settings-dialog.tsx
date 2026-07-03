"use client";
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/components/settings-context";

export function SettingsDialog() {
  const { keys, setKeys } = useSettings();
  const [open, setOpen] = useState(false);
  const [gemini, setGemini] = useState(keys.gemini);
  const [youtube, setYoutube] = useState(keys.youtube);
  const [showGemini, setShowGemini] = useState(false);
  const [showYoutube, setShowYoutube] = useState(false);

  function handleOpen(v: boolean) {
    if (v) {
      setGemini(keys.gemini);
      setYoutube(keys.youtube);
    }
    setOpen(v);
  }

  function handleSave() {
    setKeys({ gemini: gemini.trim(), youtube: youtube.trim() });
    setOpen(false);
  }

  const hasKeys = keys.gemini || keys.youtube;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">API Keys</span>
          {hasKeys && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-white">API Keys</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
            </Dialog.Close>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center justify-between">
                <span>Gemini API Key</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Get free key <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <div className="relative">
                <Input
                  type={showGemini ? "text" : "password"}
                  value={gemini}
                  onChange={e => setGemini(e.target.value)}
                  placeholder="AIza..."
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowGemini(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-1">Used for AI playlist generation (free tier available)</p>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center justify-between">
                <span>YouTube Data API v3 Key</span>
                <a
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Get free key <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <div className="relative">
                <Input
                  type={showYoutube ? "text" : "password"}
                  value={youtube}
                  onChange={e => setYoutube(e.target.value)}
                  placeholder="AIza..."
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowYoutube(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showYoutube ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-1">Used to search and link YouTube videos (~10k free daily quota)</p>
            </div>

            <Button variant="primary" className="w-full" onClick={handleSave}>
              Save Keys
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
