"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ApiKeys } from "@/lib/types";

interface SettingsContextType {
  keys: ApiKeys;
  setKeys: (k: ApiKeys) => void;
}

export const DEFAULT_KEYS: ApiKeys = {
  youtube: "",
  gemini: "",
  openai: "",
  anthropic: "",
  ollamaBaseUrl: "http://localhost:11434/v1",
  selectedProvider: "gemini",
  selectedModel: "gemini-2.0-flash",
};

const SettingsContext = createContext<SettingsContextType>({
  keys: DEFAULT_KEYS,
  setKeys: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeysState] = useState<ApiKeys>(DEFAULT_KEYS);

  useEffect(() => {
    const stored = localStorage.getItem("yt_creator_keys");
    if (stored) {
      try { setKeysState({ ...DEFAULT_KEYS, ...JSON.parse(stored) }); } catch {}
    }
  }, []);

  const setKeys = (k: ApiKeys) => {
    setKeysState(k);
    localStorage.setItem("yt_creator_keys", JSON.stringify(k));
  };

  return (
    <SettingsContext.Provider value={{ keys, setKeys }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
