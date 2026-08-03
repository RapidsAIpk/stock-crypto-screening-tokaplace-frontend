import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Props {
  apiBase: string;
}

export function ConnectionStatus({ apiBase }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const base = apiBase.replace(/\/screen$/, "");
      const res = await fetch(base, { method: "GET", signal: AbortSignal.timeout(6000) });
      setConnected(res.ok);
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, [apiBase]);

  useEffect(() => {
    check();
    // Realtime polling every 10 seconds to auto-recover when backend comes online
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [check]);

  if (connected === null) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
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
      {checking ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : connected ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      <span className="text-xs font-mono">
        {checking ? "Checking..." : connected ? "Connected" : "Disconnected (Retry)"}
      </span>
    </button>
  );
}
