import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Lock, LogOut, Play, RotateCcw, Save, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import { getAllDefaultIndicatorConfigs, INDICATOR_DEFINITIONS } from "@/types/screener";
import { INDICATOR_LABELS } from "@/components/screener/filters/IndicatorsFilter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InfoTip } from "@/components/ui/info-tip";
import { FieldLabel } from "@/components/screener/filters/FilterUi";

type HealthPayload = {
  status?: string;
  environment?: string;
  worker?: {
    running?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type WorkerOpsPayload = {
  worker?: {
    running?: boolean;
    poll_interval?: number;
    batch_size?: number;
    started_at?: number | null;
    last_run_at?: number | null;
    last_success_at?: number | null;
    last_error?: string | null;
  };
  worker_enabled_by_config?: boolean;
};

type RuntimeSettingsPayload = {
  app?: {
    name?: string;
    version?: string;
    env?: string;
    debug?: boolean;
    log_level?: string;
  };
  server?: {
    host?: string;
    port?: number;
    cors_allow_origins?: string[];
    cors_allow_credentials?: boolean;
  };
  screening?: {
    screening_max_symbols?: number;
    gate_session_ttl_seconds?: number;
  };
  worker?: {
    enabled_by_config?: boolean;
    configured_poll_interval?: number;
    configured_batch_size?: number;
    effective?: {
      running?: boolean;
      poll_interval?: number;
      batch_size?: number;
      last_success_at?: number | null;
    };
  };
  integrations?: {
    providers?: Record<string, {
      enabled?: boolean;
      paused?: boolean;
      api_key_set?: boolean;
      api_key_masked?: string;
      api_key_required?: boolean;
      call_count?: number;
      call_limit?: number | null;
    }>;
    admin_api_token_required?: boolean;
  };
};

type IntegrationProviderState = {
  enabled: boolean;
  paused: boolean;
  api_key: string;
  api_key_set: boolean;
  api_key_masked: string;
  call_count: number;
  call_limit: number | null;
};

type IntegrationsPayload = {
  providers?: Record<string, {
    enabled?: boolean;
    paused?: boolean;
    api_key_set?: boolean;
    api_key_masked?: string;
    call_count?: number;
    call_limit?: number | null;
  }>;
};

type IntegrationHistoryEntry = {
  timestamp: number;
  message?: string;
  elapsed_ms?: number;
};

type IntegrationHistoryPayload = {
  errors: IntegrationHistoryEntry[];
  response_times: IntegrationHistoryEntry[];
};

type DiagnosePayload = {
  status?: string;
  checks?: Array<{
    name?: string;
    status?: string;
    message?: string;
    call_count?: number;
    call_limit?: number | null;
  }>;
};

function toDisplayIndicatorDefaults(
  value: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const next = { ...value };
  if (next.volume && !next.volume_spike) {
    next.volume_spike = next.volume;
  }
  delete next.volume;
  return next;
}

function toInternalIndicatorDefaults(
  value: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const next = { ...value };
  if (next.volume_spike) {
    next.volume = next.volume_spike;
  }
  delete next.volume_spike;
  return next;
}

const SettingsPage = () => {
  const { user, logout, resetPassword } = useAuth();
  const { settings, loading, saveSettings } = useUserSettings();

  const [apiBaseOverride, setApiBaseOverride] = useState(settings.apiBaseOverride ?? "");
  const [adminApiToken, setAdminApiToken] = useState(settings.adminApiToken ?? "");
  const [apiTimeoutMs, setApiTimeoutMs] = useState(settings.apiTimeoutMs ?? 48000);
  const [apiRetries, setApiRetries] = useState(settings.apiRetries ?? 0);
  const [workerPollInterval, setWorkerPollInterval] = useState(settings.workerPollInterval ?? 15);
  const [workerBatchSize, setWorkerBatchSize] = useState(settings.workerBatchSize ?? 50);
  const mergedIndicatorDefaultsForEditor = useMemo(() => {
    const base = getAllDefaultIndicatorConfigs();
    const overrides = toInternalIndicatorDefaults(settings.indicatorDefaults ?? {});
    const merged = { ...base } as Record<string, Record<string, unknown>>;

    for (const [indicatorName, overrideConfig] of Object.entries(overrides)) {
      if (!overrideConfig || typeof overrideConfig !== "object" || Array.isArray(overrideConfig)) {
        continue;
      }
      merged[indicatorName] = {
        ...(merged[indicatorName] ?? {}),
        ...overrideConfig,
      };
    }

    return toDisplayIndicatorDefaults(merged);
  }, [settings.indicatorDefaults]);

  const [indicatorDefaultsText, setIndicatorDefaultsText] = useState(
    JSON.stringify(mergedIndicatorDefaultsForEditor, null, 2),
  );
  const [postFilterDefaultsText, setPostFilterDefaultsText] = useState(
    JSON.stringify(settings.postFilterDefaults ?? {}, null, 2),
  );

  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [ready, setReady] = useState<HealthPayload | null>(null);
  const [workerOps, setWorkerOps] = useState<WorkerOpsPayload | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsPayload | null>(null);
  const [healthError, setHealthError] = useState("");
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [workerBusy, setWorkerBusy] = useState(false);
  const [integrationProviders, setIntegrationProviders] = useState<Record<string, IntegrationProviderState>>({});
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [integrationHistory, setIntegrationHistory] = useState<Record<string, IntegrationHistoryPayload>>({});
  const [historyBusyProvider, setHistoryBusyProvider] = useState<string | null>(null);
  const [diagnoseBusy, setDiagnoseBusy] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosePayload | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    setApiBaseOverride(settings.apiBaseOverride ?? "");
    setAdminApiToken(settings.adminApiToken ?? "");
    setApiTimeoutMs(settings.apiTimeoutMs ?? 48000);
    setApiRetries(settings.apiRetries ?? 0);
    setWorkerPollInterval(settings.workerPollInterval ?? 15);
    setWorkerBatchSize(settings.workerBatchSize ?? 50);
    setIndicatorDefaultsText(JSON.stringify(mergedIndicatorDefaultsForEditor, null, 2));
    setPostFilterDefaultsText(JSON.stringify(settings.postFilterDefaults ?? {}, null, 2));
  }, [loading, settings, mergedIndicatorDefaultsForEditor]);

  const runtimeApiBase = useMemo(() => {
    const selected = apiBaseOverride.trim() || appEnv.apiBase;
    return selected.replace(/\/+$/, "");
  }, [apiBaseOverride]);

  const apiRoot = useMemo(() => runtimeApiBase.replace(/\/screen$/, ""), [runtimeApiBase]);

  const persistRuntimeControls = (next: {
    adminApiToken: string;
    apiBaseOverride: string;
    apiTimeoutMs: number;
    apiRetries: number;
    workerPollInterval: number;
    workerBatchSize: number;
    indicatorDefaults: Record<string, Record<string, unknown>>;
    postFilterDefaults: Record<string, unknown>;
  }) => {
    localStorage.setItem("screener.adminApiToken", next.adminApiToken.trim());
    localStorage.setItem("screener.apiBaseOverride", next.apiBaseOverride.trim());
    localStorage.setItem("screener.apiTimeoutMs", String(next.apiTimeoutMs));
    localStorage.setItem("screener.apiRetries", String(next.apiRetries));
    localStorage.setItem("screener.workerPollInterval", String(next.workerPollInterval));
    localStorage.setItem("screener.workerBatchSize", String(next.workerBatchSize));
    localStorage.setItem("screener.indicatorDefaults", JSON.stringify(next.indicatorDefaults));
    localStorage.setItem("screener.postFilterDefaults", JSON.stringify(next.postFilterDefaults));
  };

  const adminHeaders = () => ({
    "X-Admin-Token": adminApiToken.trim(),
    "Content-Type": "application/json",
  });

  const syncIntegrationProviders = (payload: IntegrationsPayload | null | undefined) => {
    const next: Record<string, IntegrationProviderState> = {};
    const providers = payload?.providers ?? {};

    for (const [name, provider] of Object.entries(providers)) {
      next[name] = {
        enabled: Boolean(provider?.enabled),
        paused: Boolean(provider?.paused),
        api_key: "",
        api_key_set: Boolean(provider?.api_key_set),
        api_key_masked: provider?.api_key_masked ?? "",
        call_count: Number(provider?.call_count ?? 0),
        call_limit: provider?.call_limit ?? null,
      };
    }

    setIntegrationProviders(next);
  };

  const callWorkerOps = async (
    path: string,
    options?: RequestInit,
  ): Promise<WorkerOpsPayload> => {
    const res = await fetch(`${runtimeApiBase}/ops/worker${path}`, {
      method: "POST",
      ...options,
      headers: {
        ...adminHeaders(),
        ...(options?.headers ?? {}),
      },
    });

    const payload = (await res.json()) as WorkerOpsPayload & { detail?: string };
    if (!res.ok) {
      throw new Error(payload.detail || "Worker operation failed");
    }
    return payload;
  };

  const refreshHealth = async () => {
    setRefreshingHealth(true);
    setHealthError("");

    try {
      const [healthRes, readyRes] = await Promise.all([
        fetch(`${apiRoot}/healthz`),
        fetch(`${apiRoot}/readyz`),
      ]);

      const healthJson = (await healthRes.json()) as HealthPayload;
      const readyJson = (await readyRes.json()) as HealthPayload;

      setHealth(healthJson);
      setReady(readyJson);
      try {
        const workerRes = await fetch(`${runtimeApiBase}/ops/worker`, {
          method: "GET",
          headers: adminHeaders(),
        });
        if (workerRes.ok) {
          setWorkerOps((await workerRes.json()) as WorkerOpsPayload);
        }
      } catch {
        // worker ops are optional in health refresh
      }
      try {
        const runtimeRes = await fetch(`${runtimeApiBase}/ops/runtime-settings`, {
          method: "GET",
          headers: adminHeaders(),
        });
        if (runtimeRes.ok) {
          const runtimePayload = (await runtimeRes.json()) as RuntimeSettingsPayload;
          setRuntimeSettings(runtimePayload);
          syncIntegrationProviders(runtimePayload.integrations);
        }
      } catch {
        // runtime settings are optional in health refresh
      }
      try {
        const integrationsRes = await fetch(`${runtimeApiBase}/ops/integrations`, {
          method: "GET",
          headers: adminHeaders(),
        });
        if (integrationsRes.ok) {
          syncIntegrationProviders((await integrationsRes.json()) as IntegrationsPayload);
        }
      } catch {
        // integration controls are optional in health refresh
      }

      if (!healthRes.ok || !readyRes.ok) {
        setHealthError("Health endpoint returned a degraded response.");
      }
    } catch (error) {
      setHealth(null);
      setReady(null);
      setHealthError(error instanceof Error ? error.message : "Health check failed");
    } finally {
      setRefreshingHealth(false);
    }
  };

  const hasAutoRefreshedHealth = useRef(false);

  useEffect(() => {
    if (loading || hasAutoRefreshedHealth.current) {
      return;
    }
    hasAutoRefreshedHealth.current = true;
    refreshHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleSaveControls = async () => {
    let parsedDefaults: Record<string, Record<string, unknown>> = {};

    try {
      parsedDefaults = JSON.parse(indicatorDefaultsText || "{}");
      if (parsedDefaults === null || typeof parsedDefaults !== "object" || Array.isArray(parsedDefaults)) {
        throw new Error("Indicator defaults must be a JSON object");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid indicator defaults JSON");
      return;
    }

    let parsedPostFilterDefaults: Record<string, unknown> = {};
    try {
      parsedPostFilterDefaults = JSON.parse(postFilterDefaultsText || "{}");
      if (
        parsedPostFilterDefaults === null ||
        typeof parsedPostFilterDefaults !== "object" ||
        Array.isArray(parsedPostFilterDefaults)
      ) {
        throw new Error("Confluence / Channel Respect defaults must be a JSON object");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid confluence / channel respect defaults JSON");
      return;
    }

    const sanitizedTimeout = Math.max(1000, Number(apiTimeoutMs) || 48000);
    const sanitizedRetries = Math.max(0, Number(apiRetries) || 0);
    const sanitizedPoll = Math.max(1, Number(workerPollInterval) || 15);
    const sanitizedBatch = Math.max(1, Number(workerBatchSize) || 50);

    const payload = {
      adminApiToken: adminApiToken.trim(),
      apiBaseOverride: apiBaseOverride.trim(),
      apiTimeoutMs: sanitizedTimeout,
      apiRetries: sanitizedRetries,
      workerPollInterval: sanitizedPoll,
      workerBatchSize: sanitizedBatch,
      indicatorDefaults: toInternalIndicatorDefaults(parsedDefaults),
      postFilterDefaults: parsedPostFilterDefaults,
    };

    await saveSettings(payload);
    persistRuntimeControls(payload);
    toast.success("Control settings applied");
  };

  const toggleDisabledIndicator = async (name: string) => {
    const current = settings.disabledIndicators ?? [];
    const disabledIndicators = current.includes(name)
      ? current.filter((n) => n !== name)
      : [...current, name];
    await saveSettings({ disabledIndicators });
  };

  const applyWorkerConfig = async () => {
    setWorkerBusy(true);
    try {
      const payload = await callWorkerOps("/config", {
        body: JSON.stringify({
          poll_interval: Math.max(1, Number(workerPollInterval) || 15),
          batch_size: Math.max(1, Number(workerBatchSize) || 50),
        }),
      });
      setWorkerOps(payload);
      toast.success("Worker config updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update worker");
    } finally {
      setWorkerBusy(false);
    }
  };

  const startWorker = async () => {
    setWorkerBusy(true);
    try {
      const payload = await callWorkerOps("/start");
      setWorkerOps(payload);
      toast.success("Worker started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start worker");
    } finally {
      setWorkerBusy(false);
    }
  };

  const stopWorker = async () => {
    setWorkerBusy(true);
    try {
      const payload = await callWorkerOps("/stop");
      setWorkerOps(payload);
      toast.success("Worker stopped");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop worker");
    } finally {
      setWorkerBusy(false);
    }
  };

  const refreshWorker = async () => {
    setWorkerBusy(true);
    try {
      const payload = await callWorkerOps("/refresh");
      setWorkerOps(payload);
      toast.success("Worker refresh completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh worker");
    } finally {
      setWorkerBusy(false);
    }
  };

  const updateIntegrationProvider = (
    name: string,
    patch: Partial<IntegrationProviderState>,
  ) => {
    setIntegrationProviders((current) => ({
      ...current,
      [name]: {
        ...(current[name] ?? {
          enabled: true,
          paused: false,
          api_key: "",
          api_key_set: false,
          api_key_masked: "",
          call_count: 0,
          call_limit: null,
        }),
        ...patch,
      },
    }));
  };

  const applyIntegrationConfig = async () => {
    setIntegrationBusy(true);
    try {
      const providersPayload = Object.fromEntries(
        Object.entries(integrationProviders).map(([name, provider]) => (
          [
            name,
            {
              enabled: provider.enabled,
              paused: provider.paused,
              api_key: provider.api_key.trim() || undefined,
              call_limit: provider.call_limit && provider.call_limit > 0 ? provider.call_limit : null,
            },
          ]
        )),
      );

      const response = await fetch(`${runtimeApiBase}/ops/integrations/config`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ providers: providersPayload }),
      });
      const payload = (await response.json()) as IntegrationsPayload & { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to update integration settings");
      }

      syncIntegrationProviders(payload);
      toast.success("Integration settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update integration settings");
    } finally {
      setIntegrationBusy(false);
    }
  };

  const fetchIntegrationHistory = async (name: string) => {
    setHistoryBusyProvider(name);
    try {
      const response = await fetch(`${runtimeApiBase}/ops/integrations/${name}/history`, {
        method: "GET",
        headers: adminHeaders(),
      });
      const payload = (await response.json()) as IntegrationHistoryPayload & { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to load integration history");
      }
      setIntegrationHistory((current) => ({ ...current, [name]: payload }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load integration history");
    } finally {
      setHistoryBusyProvider(null);
    }
  };

  const runDiagnostics = async () => {
    setDiagnoseBusy(true);
    try {
      const response = await fetch(`${runtimeApiBase}/ops/diagnose`, {
        method: "POST",
        headers: adminHeaders(),
      });
      const payload = (await response.json()) as DiagnosePayload & { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Diagnostic request failed");
      }
      setDiagnostics(payload);
      toast.success(payload.status === "ok" ? "Diagnostics passed" : "Diagnostics found warnings");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run diagnostics");
    } finally {
      setDiagnoseBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    try {
      await resetPassword(user.email);
      toast.success("Password reset email sent");
    } catch {
      toast.error("Failed to send reset email");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error("Failed to logout");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground animate-pulse">Loading settings...</p>
      </div>
    );
  }

  const actionButtonClass =
    "inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary/60 disabled:opacity-50";
  const inputClass = "w-full rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-sm";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Control Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor backend health, tune API behavior, and control worker performance.
          </p>
        </div>
        <button
          onClick={handleSaveControls}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["health", "api", "scanner", "indicators"]}
        className="space-y-3"
      >
        <AccordionItem value="health" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Site Health
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Health source: {apiRoot}</p>
              <button onClick={refreshHealth} className={actionButtonClass}>
                <RotateCcw className={`h-4 w-4 ${refreshingHealth ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Health vs Readiness</span>
              <InfoTip content="Health confirms basic service availability. Readiness confirms the app can process screening requests." />
            </div>
            {healthError && <p className="text-sm text-destructive">{healthError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-border/70 p-3 text-sm">
                <div className="text-muted-foreground">Health</div>
                <div className="font-mono mt-1">{health?.status ?? "unknown"}</div>
                <div className="mt-1 text-muted-foreground">Env: {health?.environment ?? "n/a"}</div>
              </div>
              <div className="rounded-md border border-border/70 p-3 text-sm">
                <div className="text-muted-foreground">Readiness</div>
                <div className="font-mono mt-1">{ready?.status ?? "unknown"}</div>
                <div className="mt-1 text-muted-foreground">
                  Worker: {ready?.worker?.running ? "running" : "stopped/degraded"}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="runtime" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Server Runtime Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Live server-side effective configuration.
            </p>
            <div className="max-h-64 overflow-auto rounded-md border border-border/70 p-3 text-xs font-mono whitespace-pre-wrap break-words scrollbar-thin">
              {runtimeSettings
                ? JSON.stringify(runtimeSettings, null, 2)
                : "No server runtime payload yet. Press Refresh in Site Health."}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            API Control
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-1.5">
              <FieldLabel info="Required only if backend ADMIN_API_TOKEN is configured. Sent as X-Admin-Token for protected ops.">
                Admin API Token
              </FieldLabel>
              <input
                value={adminApiToken}
                onChange={(e) => setAdminApiToken(e.target.value)}
                placeholder="X-Admin-Token"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel info="Point the UI to another backend environment without changing .env.">
                API Base Override
              </FieldLabel>
              <input
                value={apiBaseOverride}
                onChange={(e) => setApiBaseOverride(e.target.value)}
                placeholder={appEnv.apiBase}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel info="Higher timeout helps slow networks; lower timeout fails fast.">
                  Request Timeout (ms)
                </FieldLabel>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={apiTimeoutMs}
                  onChange={(e) => setApiTimeoutMs(Number(e.target.value) || 48000)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel info="Retries transient network failures. Keep low to avoid duplicate load.">
                  Retries
                </FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={apiRetries}
                  onChange={(e) => setApiRetries(Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scanner" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Scanner Controls
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="rounded-md border border-border/70 p-3 text-sm space-y-1">
              <div>Status: <span className="font-mono">{workerOps?.worker?.running ? "running" : "stopped"}</span></div>
              <div className="text-muted-foreground">Last run: {workerOps?.worker?.last_run_at ?? "n/a"}</div>
              <div className="text-muted-foreground">Last success: {workerOps?.worker?.last_success_at ?? "n/a"}</div>
              {workerOps?.worker?.last_error && (
                <div className="text-destructive">Last error: {workerOps.worker.last_error}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={startWorker} disabled={workerBusy} className={actionButtonClass}>
                <Play className="h-4 w-4" /> Start
              </button>
              <button onClick={stopWorker} disabled={workerBusy} className={actionButtonClass}>
                <Square className="h-4 w-4" /> Stop
              </button>
              <button onClick={refreshWorker} disabled={workerBusy} className={actionButtonClass}>
                <RotateCcw className={`h-4 w-4 ${workerBusy ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel>Poll Interval (seconds)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={workerPollInterval}
                  onChange={(e) => setWorkerPollInterval(Number(e.target.value) || 15)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Batch Size</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={workerBatchSize}
                  onChange={(e) => setWorkerBatchSize(Number(e.target.value) || 50)}
                  className={inputClass}
                />
              </div>
            </div>
            <button onClick={applyWorkerConfig} disabled={workerBusy} className={actionButtonClass}>
              Apply Worker Config
            </button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="indicators" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Indicator Controls
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabel info="Disabled indicators stay usable if already added to a scan; they just drop out of the Add picker.">
                Enabled Indicators
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                {INDICATOR_DEFINITIONS.map((ind) => {
                  const isDisabled = (settings.disabledIndicators ?? []).includes(ind.name);
                  return (
                    <button
                      key={ind.name}
                      onClick={() => toggleDisabledIndicator(ind.name)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        isDisabled
                          ? "border-border text-muted-foreground"
                          : "border-primary/40 bg-primary/10 text-primary"
                      }`}
                    >
                      {INDICATOR_LABELS[ind.name]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel info="Per-indicator thresholds, lengths, and lookback periods used as defaults when adding an indicator.">
                Indicator Default Parameters (JSON)
              </FieldLabel>
              <textarea
                value={indicatorDefaultsText}
                onChange={(e) => setIndicatorDefaultsText(e.target.value)}
                rows={8}
                spellCheck={false}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel info="Keys: channel_respect, confluence. Applied as toggle-on defaults for those two filters.">
                Confluence / Channel Respect Defaults (JSON)
              </FieldLabel>
              <textarea
                value={postFilterDefaultsText}
                onChange={(e) => setPostFilterDefaultsText(e.target.value)}
                rows={5}
                spellCheck={false}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs font-mono"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="integrations" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Integration Controls
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-3">
              {Object.entries(integrationProviders).length === 0 && (
                <div className="rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
                  No integration payload yet. Refresh Site Health.
                </div>
              )}
              {Object.entries(integrationProviders).map(([name, provider]) => (
                <div key={name} className="rounded-md border border-border/70 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold uppercase tracking-wide text-foreground">{name}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateIntegrationProvider(name, { enabled: !provider.enabled })}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          provider.enabled
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {provider.enabled ? "Enabled" : "Disabled"}
                      </button>
                      <button
                        onClick={() => updateIntegrationProvider(name, { paused: !provider.paused })}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          provider.paused
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {provider.paused ? "Paused" : "Not Paused"}
                      </button>
                      <InfoTip content="A paused provider keeps its config/key but is skipped by live fetches." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel>API Key</FieldLabel>
                      <input
                        value={provider.api_key}
                        onChange={(event) => updateIntegrationProvider(name, { api_key: event.target.value })}
                        placeholder={provider.api_key_masked || (provider.api_key_set ? "Configured" : "Not set")}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Call Limit (optional)</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        value={provider.call_limit ?? ""}
                        onChange={(event) => updateIntegrationProvider(name, {
                          call_limit: event.target.value ? Math.max(0, Number(event.target.value) || 0) : null,
                        })}
                        className={inputClass}
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Calls used: {provider.call_count}
                    {provider.call_limit ? ` / ${provider.call_limit}` : ""}
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => fetchIntegrationHistory(name)}
                      disabled={historyBusyProvider === name}
                      className="text-sm text-primary hover:text-primary/80 underline disabled:opacity-50"
                    >
                      {historyBusyProvider === name ? "Loading history..." : "View Errors / Response Times"}
                    </button>
                    {integrationHistory[name] && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md border border-border/60 p-2 space-y-1 max-h-40 overflow-auto scrollbar-thin">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Recent Errors</div>
                          {integrationHistory[name].errors.length === 0 && (
                            <p className="text-xs text-muted-foreground">None recorded.</p>
                          )}
                          {integrationHistory[name].errors.slice().reverse().map((entry, idx) => (
                            <div key={idx} className="text-xs text-destructive font-mono break-words">
                              {new Date(entry.timestamp * 1000).toLocaleTimeString()}: {entry.message}
                            </div>
                          ))}
                        </div>
                        <div className="rounded-md border border-border/60 p-2 space-y-1 max-h-40 overflow-auto scrollbar-thin">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Recent Response Times</div>
                          {integrationHistory[name].response_times.length === 0 && (
                            <p className="text-xs text-muted-foreground">None recorded.</p>
                          )}
                          {integrationHistory[name].response_times.slice().reverse().map((entry, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground font-mono">
                              {new Date(entry.timestamp * 1000).toLocaleTimeString()}: {entry.elapsed_ms}ms
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={applyIntegrationConfig} disabled={integrationBusy} className={actionButtonClass}>
              Apply Integration Settings
            </button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="diagnostics" className="rounded-lg border border-border bg-card px-5">
          <AccordionTrigger className="py-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Diagnostics
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Runs backend checks and lists warnings like disabled providers, missing keys, or worker issues.
            </p>
            <button onClick={runDiagnostics} disabled={diagnoseBusy} className={actionButtonClass}>
              Run Site Diagnostics
            </button>
            <div className="max-h-64 overflow-auto rounded-md border border-border/70 p-3 text-xs font-mono whitespace-pre-wrap break-words scrollbar-thin">
              {diagnostics
                ? JSON.stringify(diagnostics, null, 2)
                : "No diagnostics run yet."}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reset Password</h2>
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <button
            onClick={handleResetPassword}
            className="px-4 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Send Reset Link
          </button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 flex items-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
