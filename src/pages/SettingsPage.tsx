import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, KeyRound, Lock, LogOut, Play, RotateCcw, Save, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useProviderKeys, type ProviderName } from "@/hooks/useProviderKeys";
import { useDeferredNumberField } from "@/hooks/useDeferredNumberField";
import { toast } from "sonner";
import { appEnv } from "@/config/env";
import { getAllDefaultIndicatorConfigs } from "@/types/screener";
import { InfoTip } from "@/components/ui/info-tip";
import { FieldLabel } from "@/components/screener/filters/FilterUi";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function SettingsCard({
  title,
  icon,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card p-5",
        className,
      )}
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h2>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </section>
  );
}

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
  [key: string]: unknown;
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

function ProviderKeyRow({
  provider,
  label,
  status,
  testing,
  onSave,
  onTest,
}: {
  provider: ProviderName;
  label: string;
  status: { configured: boolean; last4: string | null };
  testing: boolean;
  onSave: (provider: ProviderName, apiKey: string) => void;
  onTest: (provider: ProviderName) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-1.5 rounded-md border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs text-muted-foreground font-mono">
          {status.configured ? `Saved •••• ${status.last4 ?? ""}` : "Not configured"}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={status.configured ? "Enter a new key to replace it" : "Paste API key"}
          autoComplete="off"
          className="w-full min-w-0 rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!value.trim()) return;
              onSave(provider, value.trim());
              setValue("");
            }}
            disabled={!value.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary/60 disabled:opacity-50 sm:flex-none"
          >
            Save
          </button>
          <button
            onClick={() => onTest(provider)}
            disabled={testing || !status.configured}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary/60 disabled:opacity-50 sm:flex-none"
          >
            <RotateCcw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} />
            Test
          </button>
        </div>
      </div>
    </div>
  );
}

const SettingsPage = () => {
  const { user, logout, resetPassword } = useAuth();
  const { settings, loading, saveSettings } = useUserSettings();
  const { status: providerKeyStatus, testing: providerKeyTesting, saveKey, testKey } = useProviderKeys();

  const [apiBaseOverride, setApiBaseOverride] = useState(settings.apiBaseOverride ?? "");
  const [apiTimeoutMs, setApiTimeoutMs] = useState(settings.apiTimeoutMs ?? 48000);
  const [apiRetries, setApiRetries] = useState(settings.apiRetries ?? 0);
  const [workerPollInterval, setWorkerPollInterval] = useState(settings.workerPollInterval ?? 15);
  const [workerBatchSize, setWorkerBatchSize] = useState(settings.workerBatchSize ?? 50);
  const [capEnabled, setCapEnabled] = useState<boolean>(
    (settings.screeningMaxSymbols ?? 0) > 0
  );
  const [maxSymbolsInput, setMaxSymbolsInput] = useState<number>(
    (settings.screeningMaxSymbols ?? 0) > 0 ? settings.screeningMaxSymbols : 75
  );
  const [screeningBusy, setScreeningBusy] = useState(false);

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

  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [ready, setReady] = useState<HealthPayload | null>(null);
  const [workerOps, setWorkerOps] = useState<WorkerOpsPayload | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsPayload | null>(null);
  const [healthError, setHealthError] = useState("");
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [workerBusy, setWorkerBusy] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    setApiBaseOverride(settings.apiBaseOverride ?? "");
    setApiTimeoutMs(settings.apiTimeoutMs ?? 48000);
    setApiRetries(settings.apiRetries ?? 0);
    setWorkerPollInterval(settings.workerPollInterval ?? 15);
    setWorkerBatchSize(settings.workerBatchSize ?? 50);
    const initialCap = (settings.screeningMaxSymbols ?? 0) > 0;
    setCapEnabled(initialCap);
    if (initialCap) {
      setMaxSymbolsInput(settings.screeningMaxSymbols);
    }
    setIndicatorDefaultsText(JSON.stringify(mergedIndicatorDefaultsForEditor, null, 2));
  }, [loading, settings, mergedIndicatorDefaultsForEditor]);

  useEffect(() => {
    if (runtimeSettings?.screening?.screening_max_symbols !== undefined) {
      const serverVal = runtimeSettings.screening.screening_max_symbols;
      if (serverVal > 0) {
        setCapEnabled(true);
        setMaxSymbolsInput(serverVal);
      } else {
        setCapEnabled(false);
      }
    }
  }, [runtimeSettings]);

  const runtimeApiBase = useMemo(() => {
    const selected = apiBaseOverride.trim() || appEnv.apiBase;
    return selected.replace(/\/+$/, "");
  }, [apiBaseOverride]);

  const apiRoot = useMemo(() => runtimeApiBase.replace(/\/screen$/, ""), [runtimeApiBase]);

  const persistRuntimeControls = (next: {
    apiBaseOverride: string;
    apiTimeoutMs: number;
    apiRetries: number;
    workerPollInterval: number;
    workerBatchSize: number;
    screeningMaxSymbols: number;
    indicatorDefaults: Record<string, Record<string, unknown>>;
  }) => {
    localStorage.setItem("screener.apiBaseOverride", next.apiBaseOverride.trim());
    localStorage.setItem("screener.apiTimeoutMs", String(next.apiTimeoutMs));
    localStorage.setItem("screener.apiRetries", String(next.apiRetries));
    localStorage.setItem("screener.workerPollInterval", String(next.workerPollInterval));
    localStorage.setItem("screener.workerBatchSize", String(next.workerBatchSize));
    localStorage.setItem("screener.screeningMaxSymbols", String(next.screeningMaxSymbols));
    localStorage.setItem("screener.indicatorDefaults", JSON.stringify(next.indicatorDefaults));
  };

  const applyScreeningConfig = async (enabled: boolean, valInput: number, showToast = true) => {
    const effectiveVal = enabled ? Math.max(1, Number(valInput) || 75) : 0;
    setScreeningBusy(true);
    try {
      const response = await fetch(`${runtimeApiBase}/ops/screening/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screening_max_symbols: effectiveVal }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to update screening config");
      }
      if (showToast) {
        if (effectiveVal === 0) {
          toast.success("Symbol cap turned OFF. Using entire market universe.");
        } else {
          toast.success(`Symbol cap set to ${effectiveVal} symbols.`);
        }
      }
      refreshHealth();
    } catch (error) {
      if (showToast) {
        toast.error(error instanceof Error ? error.message : "Failed to update screening config");
      }
    } finally {
      setScreeningBusy(false);
    }
  };

  const callWorkerOps = async (
    path: string,
    options?: RequestInit,
  ): Promise<WorkerOpsPayload> => {
    const res = await fetch(`${runtimeApiBase}/ops/worker${path}`, {
      method: "POST",
      ...options,
      headers: {
        "Content-Type": "application/json",
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
        });
        if (runtimeRes.ok) {
          setRuntimeSettings((await runtimeRes.json()) as RuntimeSettingsPayload);
        }
      } catch {
        // runtime settings are optional in health refresh
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

    const sanitizedTimeout = Math.min(900000, Math.max(1000, Number(apiTimeoutMs) || 600000));
    const sanitizedRetries = Math.max(0, Number(apiRetries) || 0);
    const sanitizedPoll = Math.max(1, Number(workerPollInterval) || 15);
    const sanitizedBatch = Math.max(1, Number(workerBatchSize) || 50);
    const effectiveMaxSymbols = capEnabled ? Math.max(1, Number(maxSymbolsInput) || 75) : 0;

    const payload = {
      apiBaseOverride: apiBaseOverride.trim(),
      apiTimeoutMs: sanitizedTimeout,
      apiRetries: sanitizedRetries,
      workerPollInterval: sanitizedPoll,
      workerBatchSize: sanitizedBatch,
      screeningMaxSymbols: effectiveMaxSymbols,
      indicatorDefaults: toInternalIndicatorDefaults(parsedDefaults),
    };

    await saveSettings(payload);
    persistRuntimeControls(payload);
    await applyScreeningConfig(capEnabled, maxSymbolsInput, false);
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

  const timeoutSecondsField = useDeferredNumberField(Math.round(apiTimeoutMs / 1000), (parsed) => {
    setApiTimeoutMs(Math.min(600, Math.max(1, parsed || 48)) * 1000);
  });
  const retriesField = useDeferredNumberField(apiRetries, (parsed) => {
    setApiRetries(Math.max(0, parsed));
  });
  const maxSymbolsField = useDeferredNumberField(maxSymbolsInput, (parsed) => {
    setMaxSymbolsInput(Math.max(1, parsed || 1));
  });
  const pollIntervalField = useDeferredNumberField(workerPollInterval, (parsed) => {
    setWorkerPollInterval(Math.max(1, parsed || 15));
  });
  const batchSizeField = useDeferredNumberField(workerBatchSize, (parsed) => {
    setWorkerBatchSize(Math.max(1, parsed || 50));
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground animate-pulse">Loading settings...</p>
      </div>
    );
  }

  const actionButtonClass =
    "inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary/60 disabled:opacity-50";
  const inputClass = "w-full rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-sm";
  const jsonPanelClass =
    "max-h-48 overflow-auto rounded-md border border-border/70 p-3 text-xs font-mono whitespace-pre-wrap break-words scrollbar-thin";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
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

      <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
        <SettingsCard title="Site Health" icon={<Activity className="h-4 w-4 text-primary" />}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground truncate" title={apiRoot}>Source: {apiRoot}</p>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </SettingsCard>

        <SettingsCard title="API Control">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel info="Higher timeout helps slow networks; lower timeout fails fast. Maximum 600s (10 minutes).">
                Request Timeout (seconds)
              </FieldLabel>
              <input
                type="number"
                min={1}
                max={600}
                step={1}
                value={timeoutSecondsField.rawText}
                onChange={timeoutSecondsField.onChange}
                onBlur={timeoutSecondsField.onBlur}
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
                value={retriesField.rawText}
                onChange={retriesField.onChange}
                onBlur={retriesField.onBlur}
                className={inputClass}
              />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title="Scanner Controls">
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
          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <FieldLabel info="Limit max symbols screened per run to save bandwidth, or turn off to screen the entire market universe.">
                  SCREENING_MAX_SYMBOLS
                </FieldLabel>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {capEnabled ? "Symbol limit active" : "Entire universe mode active"}
                </p>
              </div>
              <Switch
                checked={capEnabled}
                onCheckedChange={(checked) => {
                  setCapEnabled(checked);
                  applyScreeningConfig(checked, maxSymbolsInput);
                }}
                disabled={screeningBusy}
              />
            </div>

            {capEnabled ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  value={maxSymbolsField.rawText}
                  onChange={maxSymbolsField.onChange}
                  onBlur={maxSymbolsField.onBlur}
                  placeholder="e.g. 75"
                  className={inputClass}
                />
                <button
                  onClick={() => applyScreeningConfig(true, maxSymbolsInput)}
                  disabled={screeningBusy}
                  className={actionButtonClass}
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="rounded-md bg-secondary/60 px-3 py-2 text-xs font-medium text-emerald-500 flex items-center justify-between">
                <span>Entire Universe (Uncapped)</span>
                <span className="font-mono text-[10px] uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Poll Interval (seconds)</FieldLabel>
              <input
                type="number"
                min={1}
                value={pollIntervalField.rawText}
                onChange={pollIntervalField.onChange}
                onBlur={pollIntervalField.onBlur}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Batch Size</FieldLabel>
              <input
                type="number"
                min={1}
                value={batchSizeField.rawText}
                onChange={batchSizeField.onChange}
                onBlur={batchSizeField.onBlur}
                className={inputClass}
              />
            </div>
          </div>
          <button onClick={applyWorkerConfig} disabled={workerBusy} className={actionButtonClass}>
            Apply Worker Config
          </button>
        </SettingsCard>

        <SettingsCard title="Server Runtime">
          <p className="text-sm text-muted-foreground">Live server-side effective configuration.</p>
          <div className={jsonPanelClass}>
            {runtimeSettings
              ? JSON.stringify(runtimeSettings, null, 2)
              : "No server runtime payload yet. Press Refresh in Site Health."}
          </div>
        </SettingsCard>

        <SettingsCard title="Indicator Defaults">
          <div className="space-y-1.5">
            <FieldLabel info="Per-indicator thresholds, lengths, and lookback periods used as defaults when adding an indicator.">
              Default Parameters (JSON)
            </FieldLabel>
            <textarea
              value={indicatorDefaultsText}
              onChange={(e) => setIndicatorDefaultsText(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs font-mono"
            />
          </div>
        </SettingsCard>

        <SettingsCard title="API Keys" icon={<KeyRound className="h-4 w-4 text-primary" />}>
          <p className="text-xs text-muted-foreground">
            Keys are write-only: once saved, they are never sent back to this page. Use Test to
            confirm a saved key is working.
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-500">
            These are app-wide keys, not personal ones. Saving a Massive key here replaces the
            key the entire site uses for every user's scans, immediately.
          </p>
          <ProviderKeyRow
            provider="massive"
            label="Massive (market data)"
            status={providerKeyStatus.massive}
            testing={!!providerKeyTesting.massive}
            onSave={saveKey}
            onTest={testKey}
          />
          <ProviderKeyRow
            provider="zoya"
            label="Zoya (Sharia compliance)"
            status={providerKeyStatus.zoya}
            testing={!!providerKeyTesting.zoya}
            onSave={saveKey}
            onTest={testKey}
          />
          <p className="text-xs text-muted-foreground">
            Note: the Zoya key saved here does not affect live scans. Zoya compliance data comes
            from a periodically refreshed local file, updated by running a maintenance script
            with this key by hand — it is stored here for reference/testing only.
          </p>
        </SettingsCard>

        <SettingsCard title="Preferences & Account">
          <div className="flex items-center justify-between gap-2 rounded-md border border-border/70 p-3">
            <div>
              <FieldLabel info="When on, the app clock always shows New York (market) time. When off, it shows your device's local time.">
                New York Time Override
              </FieldLabel>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings.nyTimeOverride ? "Showing New York time" : "Showing your local time"}
              </p>
            </div>
            <Switch
              checked={settings.nyTimeOverride}
              onCheckedChange={(checked) => saveSettings({ nyTimeOverride: checked })}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleResetPassword}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <Lock className="h-4 w-4" />
              Send Reset Link
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};

export default SettingsPage;
