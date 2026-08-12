import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { appEnv } from "@/config/env";

export type ProviderName = "massive" | "zoya";

export interface ProviderKeyStatus {
  configured: boolean;
  last4: string | null;
  updated_at: number | null;
}

export type ProviderKeyStatusMap = Record<ProviderName, ProviderKeyStatus>;

const EMPTY_STATUS: ProviderKeyStatus = { configured: false, last4: null, updated_at: null };

const EMPTY_STATUS_MAP: ProviderKeyStatusMap = {
  massive: EMPTY_STATUS,
  zoya: EMPTY_STATUS,
};

function apiRoot(): string {
  const override = localStorage.getItem("screener.apiBaseOverride")?.trim();
  const base = (override || appEnv.apiBase).replace(/\/+$/, "");
  return base.replace(/\/screen$/, "");
}

function userHeaders(uid: string | undefined): Record<string, string> {
  return uid ? { "X-User-Id": uid } : {};
}

export function useProviderKeys() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProviderKeyStatusMap>(EMPTY_STATUS_MAP);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<Partial<Record<ProviderName, boolean>>>({});

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setStatus(EMPTY_STATUS_MAP);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiRoot()}/auth/provider-keys`, {
        headers: userHeaders(user.uid),
      });
      if (res.ok) {
        const payload = await res.json();
        setStatus({ ...EMPTY_STATUS_MAP, ...(payload.data ?? {}) });
      }
    } catch (e) {
      console.error("Failed to load provider key status:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const saveKey = useCallback(
    async (provider: ProviderName, apiKey: string) => {
      if (!user) return;
      try {
        const res = await fetch(`${apiRoot()}/auth/provider-keys`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...userHeaders(user.uid) },
          body: JSON.stringify({ provider, api_key: apiKey }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.detail || "Failed to save key");
        }
        const payload = await res.json();
        setStatus({ ...EMPTY_STATUS_MAP, ...(payload.data ?? {}) });
        toast.success(`${provider === "massive" ? "Massive" : "Zoya"} key saved`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save key");
      }
    },
    [user]
  );

  const testKey = useCallback(
    async (provider: ProviderName) => {
      if (!user) return;
      setTesting((prev) => ({ ...prev, [provider]: true }));
      try {
        const res = await fetch(`${apiRoot()}/auth/provider-keys/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...userHeaders(user.uid) },
          body: JSON.stringify({ provider }),
        });
        const payload = await res.json();
        if (payload.connected) {
          toast.success(`${provider === "massive" ? "Massive" : "Zoya"}: ${payload.detail}`);
        } else {
          toast.error(`${provider === "massive" ? "Massive" : "Zoya"}: ${payload.detail}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Connection test failed");
      } finally {
        setTesting((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [user]
  );

  return { status, loading, testing, saveKey, testKey };
}
