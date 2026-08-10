import { createContext, useContext, type ReactNode } from "react";
import { useScreener } from "@/hooks/useScreener";
import { useUserSettings } from "@/hooks/useUserSettings";

type ScreenerContextType = ReturnType<typeof useScreener>;

const ScreenerContext = createContext<ScreenerContextType | null>(null);

export function ScreenerProvider({ children }: { children: ReactNode }) {
  // Request timeout/retries are read from the signed-in account's saved
  // settings (synced via the backend), not just this browser's localStorage,
  // so they follow the user across devices instead of only taking effect
  // after re-saving Settings on each one.
  const { settings } = useUserSettings();
  const state = useScreener({
    apiTimeoutMs: settings.apiTimeoutMs,
    apiRetries: settings.apiRetries,
  });
  return (
    <ScreenerContext.Provider value={state}>
      {children}
    </ScreenerContext.Provider>
  );
}

export function useScreenerContext() {
  const ctx = useContext(ScreenerContext);
  if (!ctx) throw new Error("useScreenerContext must be used within ScreenerProvider");
  return ctx;
}
