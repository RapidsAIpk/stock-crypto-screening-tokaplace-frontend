import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Props {
  apiBase: string;
  isScanning?: boolean;
  errorMessage?: string | null;
}

export function ConnectionStatus({ apiBase, isScanning = false, errorMessage = null }: Props) {
  const [connected, setConnected] = useState<boolean | null>(true);
  const [checking, setChecking] = useState(false);

  // Manual retry or initial check
  const check = useCallback(async () => {
    setChecking(true);
    try {
      const base = apiBase.replace(/\/screen$/, "");
      const res = await fetch(base, { method: "GET", signal: AbortSignal.timeout(5000) });
      setConnected(res.ok);
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, [apiBase]);

  // Initial check on mount
  useEffect(() => {
    check();
  }, [check]);

  // Network error detection from scan runs
  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    const lower = errorMessage.toLowerCase();
    if (
      lower.includes("failed to fetch") ||
      lower.includes("networkerror") ||
      lower.includes("connection refused") ||
      lower.includes("net::err_connection_refused")
    ) {
      setConnected(false);
    }
  }, [errorMessage]);

  if (isScanning) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs font-mono">Backend Active (Scanning...)</span>
      </div>
    );
  }

  if (connected === null || checking) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs font-mono">Checking...</span>
      </div>
    );
  }

  return (
    <button
      onClick={check}
      title="Click to check connection status"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all hover:opacity-80 ${
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {connected ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      <span className="text-xs font-mono">
        {connected ? "Connected" : "Disconnected (Click to Retry)"}
      </span>
    </button>
  );
}

