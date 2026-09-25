import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppSettings } from "../types";
import { readSettings, writeSettings } from "../projects/projectStorage";
import { translate, type MessageKey } from "../i18n";

interface SettingsValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());

  useEffect(() => {
    writeSettings(settings);
    document.documentElement.lang = settings.language === "fa" ? "fa" : "en";
    document.documentElement.dir = settings.language === "fa" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      t: (key, vars) => translate(settings.language, key, vars),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("Settings missing");
  return value;
}
