import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  AssetType, TimeframeMode, ComplianceStatus,
  IndicatorConfig, ChannelRespect, Confluence, PriceRange, DeadAssetsFilter,
} from "@/types/screener";

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
  adminApiToken: string;
  apiBaseOverride: string;
  apiTimeoutMs: number;
  apiRetries: number;
  workerPollInterval: number;
  workerBatchSize: number;
  timezone: string;
  indicatorDefaults: Record<string, Record<string, unknown>>;
  presets: FilterPreset[];
  watchlist: WatchlistEntry[];
  disabledIndicators: string[];
  postFilterDefaults: PostFilterDefaults;
}

const DEFAULT_SETTINGS: UserSettings = {
  apiKey: "",
  adminApiToken: "",
  apiBaseOverride: "",
  apiTimeoutMs: 48000,
  apiRetries: 0,
  workerPollInterval: 15,
  workerBatchSize: 50,
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

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as UserSettings);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const saveSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      if (!user) return;
      const updated = { ...settings, ...partial };
      setSettings(updated);
      try {
        await setDoc(doc(db, "users", user.uid), updated, { merge: true });
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
