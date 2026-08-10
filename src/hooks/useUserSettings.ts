import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import type {
  AssetType, TimeframeMode, ComplianceStatus,
  IndicatorConfig, ChannelRespect, Confluence, PriceRange, DeadAssetsFilter,
} from "@/types/screener";

function apiRoot(): string {
  const override = localStorage.getItem("screener.apiBaseOverride")?.trim();
  const base = (override || appEnv.apiBase).replace(/\/+$/, "");
  return base.replace(/\/screen$/, "");
}

function userHeaders(uid: string | undefined): Record<string, string> {
  return uid ? { "X-User-Id": uid } : {};
}

export interface FilterSnapshot {
  assetType: AssetType;
  complianceStatus: ComplianceStatus | null;
  complianceStandards: string[];
  assetCategories: string[];
  sectors: string[];
  excludedCategories: string[];
  cryptoExchanges: string[];
  timeframeMode: TimeframeMode;
  singleTimeframe: string;
  gateTimeframe: string;
  entryTimeframe: string;
  indicators: IndicatorConfig[];
  channelRespect: ChannelRespect | null;
  confluence: Confluence | null;
  priceRange: PriceRange | null;
  deadAssets: DeadAssetsFilter | null;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterSnapshot;
  createdAt: number;
}

export interface WatchlistEntry {
  id: string;
  symbol: string;
  assetType: AssetType;
  note?: string;
  addedAt: number;
}

export interface PostFilterDefaults {
  channel_respect?: Record<string, unknown>;
  confluence?: Record<string, unknown>;
}

export interface UserSettings {
  apiKey: string;
  apiBaseOverride: string;
  apiTimeoutMs: number;
  apiRetries: number;
  workerPollInterval: number;
  workerBatchSize: number;
  screeningMaxSymbols: number;
  timezone: string;
  indicatorDefaults: Record<string, Record<string, unknown>>;
  presets: FilterPreset[];
  watchlist: WatchlistEntry[];
  disabledIndicators: string[];
  postFilterDefaults: PostFilterDefaults;
}

const DEFAULT_SETTINGS: UserSettings = {
  apiKey: "",
  apiBaseOverride: "",
  apiTimeoutMs: 600000,
  apiRetries: 0,
  workerPollInterval: 15,
  workerBatchSize: 50,
  screeningMaxSymbols: 75,
  timezone: "UTC",
  indicatorDefaults: {},
  presets: [],
  watchlist: [],
  disabledIndicators: [],
  postFilterDefaults: {},
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${apiRoot()}/auth/settings`, {
          headers: userHeaders(user.uid),
        });
        if (res.ok) {
          const payload = await res.json();
          if (!cancelled) {
            setSettings({ ...DEFAULT_SETTINGS, ...(payload.data ?? {}) } as UserSettings);
          }
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      if (!user) return;
      const updated = { ...settings, ...partial };
      setSettings(updated);
      try {
        const res = await fetch(`${apiRoot()}/auth/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...userHeaders(user.uid) },
          body: JSON.stringify({ data: partial }),
        });
        if (!res.ok) {
          throw new Error("Failed to save settings");
        }
        toast.success("Settings saved");
      } catch (e) {
        console.error("Failed to save settings:", e);
        toast.error("Failed to save settings");
      }
    },
    [user, settings]
  );

  const savePreset = useCallback(
    async (name: string, filters: FilterSnapshot) => {
      const preset: FilterPreset = {
        id: crypto.randomUUID(),
        name,
        filters,
        createdAt: Date.now(),
      };
      const presets = [...settings.presets, preset];
      await saveSettings({ presets });
      return preset;
    },
    [settings.presets, saveSettings]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const presets = settings.presets.filter((p) => p.id !== id);
      await saveSettings({ presets });
    },
    [settings.presets, saveSettings]
  );

  const addWatchlistEntry = useCallback(
    async (symbol: string, assetType: AssetType, note?: string) => {
      const trimmedNote = note?.trim();
      const entry: WatchlistEntry = {
        id: crypto.randomUUID(),
        symbol,
        assetType,
        addedAt: Date.now(),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };
      const watchlist = [...settings.watchlist, entry];
      await saveSettings({ watchlist });
      return entry;
    },
    [settings.watchlist, saveSettings]
  );

  const updateWatchlistEntry = useCallback(
    async (id: string, patch: Partial<Pick<WatchlistEntry, "note" | "symbol" | "assetType">>) => {
      const watchlist = settings.watchlist.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      );
      await saveSettings({ watchlist });
    },
    [settings.watchlist, saveSettings]
  );

  const removeWatchlistEntry = useCallback(
    async (id: string) => {
      const watchlist = settings.watchlist.filter((entry) => entry.id !== id);
      await saveSettings({ watchlist });
    },
    [settings.watchlist, saveSettings]
  );

  return {
    settings,
    loading,
    saveSettings,
    savePreset,
    deletePreset,
    addWatchlistEntry,
    updateWatchlistEntry,
    removeWatchlistEntry,
  };
}
