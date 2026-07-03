"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ApiKeys } from "@/lib/types";

interface SettingsContextType {
  keys: ApiKeys;
  setKeys: (k: ApiKeys) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  keys: { gemini: "", youtube: "" },
  setKeys: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeysState] = useState<ApiKeys>({ gemini: "", youtube: "" });

  useEffect(() => {
    const stored = localStorage.getItem("yt_creator_keys");
    if (stored) {
      try { setKeysState(JSON.parse(stored)); } catch {}
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
