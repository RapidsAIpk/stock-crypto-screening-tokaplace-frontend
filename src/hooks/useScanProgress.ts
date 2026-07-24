import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanProgressEvent, ScanProgressState } from "@/types/screener";
import { appEnv } from "@/config/env";

const MAX_LOG_ENTRIES = 12;

function runtimeApiBase(): string {
  const override = localStorage.getItem("screener.apiBaseOverride")?.trim();
  const base = override || appEnv.apiBase;
  return base.replace(/\/+$/, "");
}

function buildProgressWebSocketUrl(scanId: string): string {
  const base = runtimeApiBase();
  const url = new URL(base.endsWith("/") ? base : `${base}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws/progress`;
  url.searchParams.set("scan_id", scanId);
  return url.toString();
}

function createScanId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const INITIAL_STATE: ScanProgressState = {
  connected: false,
  stage: null,
  message: "Connecting to scan progress...",
  symbol: null,
  current: null,
  total: null,
  detail: null,
  log: [],
};

export function useScanProgress() {
  const [progress, setProgress] = useState<ScanProgressState>(INITIAL_STATE);
  const socketRef = useRef<WebSocket | null>(null);
  const scanIdRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    scanIdRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(INITIAL_STATE);
  }, []);

  const beginScan = useCallback(async () => {
    const scanId = createScanId();
    disconnect();

    scanIdRef.current = scanId;
    setProgress({
      ...INITIAL_STATE,
      message: "Waiting for pipeline updates...",
    });

    await new Promise<void>((resolve) => {
      const socket = new WebSocket(buildProgressWebSocketUrl(scanId));
      socketRef.current = socket;
      const timeoutId = window.setTimeout(() => resolve(), 1500);

      const finish = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };

      socket.onopen = () => {
        setProgress((current) => ({
          ...current,
          connected: true,
          message: "Connected. Starting scan...",
        }));
        finish();
      };

      socket.onmessage = (event) => {
        let payload: ScanProgressEvent;
        try {
          payload = JSON.parse(event.data) as ScanProgressEvent;
        } catch {
          return;
        }

        setProgress((current) => ({
          connected: true,
          stage: payload.stage ?? current.stage,
          message: payload.message ?? current.message,
          symbol: payload.symbol ?? null,
          current: payload.current ?? current.current,
          total: payload.total ?? current.total,
          detail: payload.detail ?? current.detail,
          log: [
            {
              stage: payload.stage ?? "update",
              message: payload.message ?? "Pipeline update",
              symbol: payload.symbol ?? null,
              timestamp: payload.timestamp ?? Date.now(),
            },
            ...current.log,
          ].slice(0, MAX_LOG_ENTRIES),
        }));
      };

      socket.onerror = () => {
        setProgress((current) => ({
          ...current,
          connected: false,
          message: "Progress stream unavailable. Scan is still running.",
        }));
        finish();
      };

      socket.onclose = () => {
        setProgress((current) => ({
          ...current,
          connected: false,
        }));
      };
    });

    return scanId;
  }, [disconnect]);

  const endScan = useCallback(() => {
    disconnect();
    setProgress(INITIAL_STATE);
  }, [disconnect]);

  useEffect(() => () => {
    disconnect();
  }, [disconnect]);

  return {
    progress,
    beginScan,
    endScan,
    resetProgress,
    activeScanId: scanIdRef,
  };
}
