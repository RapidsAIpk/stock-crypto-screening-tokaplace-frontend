import { useState, useCallback, useEffect } from "react";
import type {
  AssetType,
  CryptoExchangeOption,
  CryptoExchangeOptionsResponse,
  StockFilterOption,
  StockFilterOptionsResponse,
  TimeframeMode,
  ComplianceStatus,
  IndicatorConfig,
  ChannelRespect,
  Confluence,
  PriceRange,
  DeadAssetsFilter,
  ScanStage,
  ScreenerDetailRequest,
  ScreenerDetailResponse,
  ScreenerRequest,
  ScreenerResult,
  ScreenerResultDetail,
  ScreenerResultsBulkExport,
  ScreenerResultExportEntry,
} from "@/types/screener";
import { DEFAULT_DEAD_ASSETS_FILTER, STOCK_ASSET_CATEGORIES, STOCK_SECTORS } from "@/types/screener";
import { normalizeConfluenceConfig, normalizeIndicatorConfig } from "@/types/screener";
import type { FilterSnapshot } from "@/hooks/useUserSettings";
import { appEnv } from "@/config/env";

const API_BASE = appEnv.apiBase;
const VALID_INDICATOR_NAMES = new Set([
  "rsi",
  "wavetrend",
  "aroon",
  "adx",
  "vlr",
  "lrc",
  "regression",
  "trend",
  "linreg_candles",
  "ema",
  "macd",
  "volume",
  "relative_volume",
  "current_volume",
  "float",
  "shares_outstanding",
  "volatility",
]);

interface ResultContext {
  request: ScreenerRequest;
  stage: ScanStage;
  timeframe: string;
}

function runtimeApiBase(): string {
  const override = localStorage.getItem("screener.apiBaseOverride")?.trim();
  const base = override || API_BASE;
  return base.replace(/\/+$/, "");
}

function runtimeTimeoutMs(): number {
  const parsed = Number(localStorage.getItem("screener.apiTimeoutMs") || "");
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : 48000;
}

function runtimeRetries(): number {
  const parsed = Number(localStorage.getItem("screener.apiRetries") || "");
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("aborterror") || message.includes("aborted");
}

function timeframeToSeconds(value: string): number | null {
  const lowered = String(value || "").trim().toLowerCase();
  const fixed: Record<string, number> = {
    "1m": 60,
    "5m": 5 * 60,
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
    "4h": 4 * 60 * 60,
    "1day": 24 * 60 * 60,
  };

  if (fixed[lowered]) {
    return fixed[lowered];
  }

  const match = lowered.match(/^(\d+)\s*(m|h|d|w|mo|day)$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2] === "day" ? "d" : match[2];
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 60 * 60;
  if (unit === "d") return amount * 24 * 60 * 60;
  if (unit === "w") return amount * 7 * 24 * 60 * 60;
  return amount * 30 * 24 * 60 * 60;
}

function normalizeCryptoExchangeSelection(
  values: string[] | null | undefined,
  availableExchanges: string[] = [],
): string[] {
  const normalized = Array.from(
    new Set(
      (values || [])
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ).sort();

  if (!normalized.length) {
    return [];
  }

  if (
    availableExchanges.length
    && availableExchanges.every((exchange) => normalized.includes(exchange))
  ) {
    return [];
  }

  return normalized;
}

function cryptoExchangeNames(options: CryptoExchangeOption[]): string[] {
  return options.map((option) => option.exchange);
}

export function useScreener() {

  // -------------------------------------------------------
  // FILTER STATE
  // -------------------------------------------------------

  const [assetType, setAssetType] = useState<AssetType>("stocks");

  const [complianceStatus, setComplianceStatus] =
    useState<ComplianceStatus | null>(null);

  const [complianceStandards, setComplianceStandards] =
    useState<string[]>([]);

  const [assetCategories, setAssetCategories] =
    useState<string[]>([]);
  const [sectors, setSectors] =
    useState<string[]>([]);
  const [availableStockAssetCategories, setAvailableStockAssetCategories] =
    useState<StockFilterOption[]>(STOCK_ASSET_CATEGORIES);
  const [availableStockSectors, setAvailableStockSectors] =
    useState<string[]>([...STOCK_SECTORS]);
  const [stockFilterOptionsLoading, setStockFilterOptionsLoading] =
    useState(false);

  const [excludedCategories, setExcludedCategories] =
    useState<string[]>([]);
  const [cryptoExchanges, setCryptoExchanges] =
    useState<string[]>([]);
  const [availableCryptoExchanges, setAvailableCryptoExchanges] =
    useState<CryptoExchangeOption[]>([]);
  const [cryptoExchangeOptionsLoading, setCryptoExchangeOptionsLoading] =
    useState(false);

  const [timeframeMode, setTimeframeMode] =
    useState<TimeframeMode>("single");

  const [singleTimeframe, setSingleTimeframe] =
    useState<string>("1day");

  const [gateTimeframe, setGateTimeframe] =
    useState<string>("1day");

  const [entryTimeframe, setEntryTimeframe] =
    useState<string>("4h");

  const [indicators, setIndicators] =
    useState<IndicatorConfig[]>([]);

  const [channelRespect, setChannelRespect] =
    useState<ChannelRespect | null>(null);

  const [confluence, setConfluence] =
    useState<Confluence | null>(null);

  const [priceRange, setPriceRange] =
    useState<PriceRange | null>(null);

  const [deadAssets, setDeadAssets] =
    useState<DeadAssetsFilter | null>(DEFAULT_DEAD_ASSETS_FILTER);


  // -------------------------------------------------------
  // RESULT STATE
  // -------------------------------------------------------

  const [results, setResults] =
    useState<ScreenerResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [gateCompleted, setGateCompleted] =
    useState(false);

  const [entryCompleted, setEntryCompleted] =
    useState(false);

  const [gateCount, setGateCount] =
    useState(0);

  const [entryCount, setEntryCount] =
    useState(0);
  const [gateSessionId, setGateSessionId] =
    useState<string | null>(null);
  const [lastResultContext, setLastResultContext] =
    useState<ResultContext | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCryptoExchangeOptions = async () => {
      setCryptoExchangeOptionsLoading(true);

      try {
        const response = await fetch(`${runtimeApiBase()}/crypto-exchanges`);
        if (!response.ok) {
          throw new Error("Failed to load crypto exchange options.");
        }

        const data = await response.json() as CryptoExchangeOptionsResponse;
        if (!cancelled) {
          setAvailableCryptoExchanges(
            data.exchanges
              .map((option) => ({
                exchange: String(option.exchange || "").trim().toLowerCase(),
                coin_count: Number.isFinite(option.coin_count) ? option.coin_count : 0,
              }))
              .filter((option) => option.exchange)
              .sort((left, right) => left.exchange.localeCompare(right.exchange)),
          );
        }
      } catch (error) {
        console.error("Failed to load crypto exchange options:", error);
      } finally {
        if (!cancelled) {
          setCryptoExchangeOptionsLoading(false);
        }
      }
    };

    loadCryptoExchangeOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStockFilterOptions = async () => {
      setStockFilterOptionsLoading(true);
      try {
        const response = await fetch(`${runtimeApiBase()}/stock-filter-options`);
        if (!response.ok) {
          return;
        }

        const data = await response.json() as StockFilterOptionsResponse;
        if (cancelled) {
          return;
        }

        if (data.asset_categories?.length) {
          setAvailableStockAssetCategories(data.asset_categories);
        }
        if (data.sectors?.length) {
          setAvailableStockSectors(data.sectors);
        }
      } catch (error) {
        console.error("Failed to load stock filter options:", error);
      } finally {
        if (!cancelled) {
          setStockFilterOptionsLoading(false);
        }
      }
    };

    loadStockFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  function buildRequestSnapshot(): ScreenerRequest {
    const safeIndicators = sanitizeIndicators(indicators);
    const safeConfluence = normalizeConfluenceConfig(confluence);
    const normalizedCryptoExchanges = normalizeCryptoExchangeSelection(
      cryptoExchanges,
      cryptoExchangeNames(availableCryptoExchanges),
    );

    const safeChannelRespect = channelRespect
      ? {
          ...channelRespect,
          line: channelRespect.line ?? "middle",
          cluster_gap: Math.min(5, Math.max(3, channelRespect.cluster_gap ?? 3)),
        }
      : null;

    return {
      asset_type: assetType,
      stock_sources: assetType === "stocks"
        ? ["zoya"]
        : null,
      exchanges: assetType === "crypto"
        ? (normalizedCryptoExchanges.length ? normalizedCryptoExchanges : null)
        : null,
      compliance_status: assetType === "stocks"
        ? complianceStatus
        : null,
      compliance_standards: null,
      asset_categories: assetType === "stocks"
        ? (assetCategories.length ? assetCategories : null)
        : null,
      sectors: assetType === "stocks"
        ? (sectors.length ? sectors : null)
        : null,
      excluded_categories: assetType === "crypto"
        ? (excludedCategories.length
          ? excludedCategories
          : null)
        : null,
      timeframe_mode: timeframeMode,
      single_timeframe: timeframeMode === "single"
        ? singleTimeframe
        : null,
      gate_timeframe: timeframeMode === "gate_entry"
        ? gateTimeframe
        : null,
      entry_timeframe: timeframeMode === "gate_entry"
        ? entryTimeframe
        : null,
      gate_session_id: null,
      indicators: safeIndicators,
      channel_respect: safeChannelRespect,
      confluence:
        safeConfluence && (safeConfluence.sources?.length ?? 0) >= 2
          ? safeConfluence
          : null,
      price_range: priceRange,
      dead_assets: deadAssets,
    };
  }

  // -------------------------------------------------------
  // RESET
  // -------------------------------------------------------

  const resetGateEntry = useCallback(() => {
    setGateCompleted(false);
    setEntryCompleted(false);
    setGateSessionId(null);
    setStatusMessage("");
    setErrorMessage("");
  }, []);

  const normalizeGateEntryPair = useCallback((gate: string, entry: string) => {
    const gateSeconds = timeframeToSeconds(gate);
    const entrySeconds = timeframeToSeconds(entry);

    if (
      gateSeconds !== null
      && entrySeconds !== null
      && gateSeconds < entrySeconds
    ) {
      return {
        gate: entry,
        entry: gate,
      };
    }

    return { gate, entry };
  }, []);

  const sanitizeIndicators = useCallback(
    (nextIndicators: IndicatorConfig[]): IndicatorConfig[] =>
      nextIndicators
        .filter((indicator) => VALID_INDICATOR_NAMES.has(indicator.name))
        .map(normalizeIndicatorConfig),
    [],
  );


  // -------------------------------------------------------
  // SNAPSHOT
  // -------------------------------------------------------

  const getSnapshot = useCallback((): FilterSnapshot => ({
    assetType,
    complianceStatus,
    complianceStandards,
    assetCategories,
    sectors,
    excludedCategories,
    cryptoExchanges: normalizeCryptoExchangeSelection(
      cryptoExchanges,
      cryptoExchangeNames(availableCryptoExchanges),
    ),
    timeframeMode,
    singleTimeframe,
    gateTimeframe,
    entryTimeframe,
    indicators,
    channelRespect,
    confluence,
    priceRange,
    deadAssets,
  }), [
    assetType,
    complianceStatus,
    complianceStandards,
    assetCategories,
    sectors,
    excludedCategories,
    cryptoExchanges,
    availableCryptoExchanges,
    timeframeMode,
    singleTimeframe,
    gateTimeframe,
    entryTimeframe,
    indicators,
    channelRespect,
    confluence,
    priceRange,
    deadAssets,
  ]);


  const loadSnapshot = useCallback((snap: FilterSnapshot) => {

    setAssetType(snap.assetType);
    setComplianceStatus(snap.complianceStatus);
    setComplianceStandards(snap.complianceStandards);
    setAssetCategories(snap.assetCategories ?? []);
    setSectors(snap.sectors ?? []);
    setExcludedCategories(snap.excludedCategories);
    setCryptoExchanges(
      normalizeCryptoExchangeSelection(
        snap.cryptoExchanges,
        cryptoExchangeNames(availableCryptoExchanges),
      ),
    );
    setTimeframeMode(snap.timeframeMode);
    setSingleTimeframe(snap.singleTimeframe);
    const normalizedPair = normalizeGateEntryPair(snap.gateTimeframe, snap.entryTimeframe);
    setGateTimeframe(normalizedPair.gate);
    setEntryTimeframe(normalizedPair.entry);
    setIndicators(sanitizeIndicators(snap.indicators));
    setChannelRespect(snap.channelRespect);
    setConfluence(normalizeConfluenceConfig(snap.confluence));
    setPriceRange(snap.priceRange ?? null);
    setDeadAssets(snap.deadAssets !== undefined ? snap.deadAssets : DEFAULT_DEAD_ASSETS_FILTER);

    resetGateEntry();
    setResults([]);
    setLastResultContext(null);

  }, [availableCryptoExchanges, normalizeGateEntryPair, resetGateEntry, sanitizeIndicators]);


  // -------------------------------------------------------
  // BUILD REQUEST
  // -------------------------------------------------------

  const buildRequest = useCallback((): ScreenerRequest => {
    return buildRequestSnapshot();
  }, [
    assetType,
    complianceStatus,
    complianceStandards,
    assetCategories,
    sectors,
    excludedCategories,
    cryptoExchanges,
    availableCryptoExchanges,
    timeframeMode,
    singleTimeframe,
    gateTimeframe,
    entryTimeframe,
    indicators,
    channelRespect,
    confluence,
    priceRange,
    deadAssets,
    sanitizeIndicators
  ]);


  // -------------------------------------------------------
  // API CALL
  // -------------------------------------------------------

  const callAPI = async <T>(
    endpoint: string,
    body: ScreenerRequest | ScreenerDetailRequest
  ): Promise<T> => {
    const base = runtimeApiBase();
    const timeoutMs = runtimeTimeoutMs();
    const retries = runtimeRetries();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${base}/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) {
          let message = "Backend error";

          try {
            const errorData = await res.json();
            if (typeof errorData?.detail === "string") {
              message = errorData.detail;
            } else if (Array.isArray(errorData?.detail) && errorData.detail.length > 0) {
              const first = errorData.detail[0];
              if (typeof first?.msg === "string") {
                message = first.msg;
              }
            }
          } catch {
            // Ignore JSON parse failures and fall back to the default message.
          }

          throw new Error(message);
        }

        return res.json() as Promise<T>;
      } catch (error) {
        if (isAbortError(error)) {
          const timeoutSeconds = Math.max(1, Math.round(timeoutMs / 1000));
          lastError = new Error(
            `Request timed out after ${timeoutSeconds}s. Increase timeout in Settings > API Control.`
          );
        } else {
          lastError = error instanceof Error ? error : new Error("Request failed");
        }
        if (attempt >= retries) {
          break;
        }
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    }

    throw lastError ?? new Error("Request failed");

  };

  const validateGateEntryTimeframes = useCallback(() => {
    const gateSeconds = timeframeToSeconds(gateTimeframe);
    const entrySeconds = timeframeToSeconds(entryTimeframe);

    if (
      gateSeconds !== null
      && entrySeconds !== null
      && gateSeconds <= entrySeconds
    ) {
      throw new Error("Gate timeframe must be larger than entry timeframe.");
    }
  }, [entryTimeframe, gateTimeframe]);

  const buildGateBody = useCallback(() => {
    const body = buildRequest();
    body.timeframe_mode = "gate_entry";
    body.indicators = body.indicators.filter(
      i => i.timeframe === "primary"
    );
    return body;
  }, [buildRequest]);

  const buildEntryBody = useCallback((sessionId: string) => {
    const body = buildRequest();
    body.timeframe_mode = "gate_entry";
    body.indicators = body.indicators.filter(
      i => i.timeframe === "secondary"
    );
    body.gate_session_id = sessionId;
    return body;
  }, [buildRequest]);


  // -------------------------------------------------------
  // SINGLE SCAN
  // -------------------------------------------------------

  const runSingle = useCallback(async () => {

    setLoading(true);
    setErrorMessage("");

    try {

      const body = buildRequest();
      body.timeframe_mode = "single";

      const data = await callAPI<{ results?: ScreenerResult[] }>("run", body);

      setResults(data.results || []);
      setLastResultContext({
        request: body,
        stage: "single",
        timeframe: body.single_timeframe || singleTimeframe,
      });

      setStatusMessage(
        `Screening completed. ${data.results?.length || 0} assets found.`
      );

    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Backend unavailable");

    } finally {

      setLoading(false);

    }

  }, [buildRequest, singleTimeframe]);


  // -------------------------------------------------------
  // GATE
  // -------------------------------------------------------

  const runGate = useCallback(async () => {

    setLoading(true);
    setErrorMessage("");
    setEntryCompleted(false);

    try {
      validateGateEntryTimeframes();
      const body = buildGateBody();

      const data = await callAPI<{ results?: ScreenerResult[]; gate_session_id?: string | null }>("run-gate", body);

      const count = data.results?.length || 0;
      const sessionId = data.gate_session_id ?? null;

      setGateCompleted(true);
      setGateCount(count);
      setGateSessionId(sessionId);
      setResults(data.results || []);
      setLastResultContext({
        request: body,
        stage: "gate",
        timeframe: body.gate_timeframe || gateTimeframe,
      });

      setStatusMessage(
        `Gate completed. ${count} symbols passed.`
      );

    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Gate scan failed");

    } finally {

      setLoading(false);

    }

  }, [buildGateBody, callAPI, gateTimeframe, validateGateEntryTimeframes]);


  // -------------------------------------------------------
  // ENTRY
  // -------------------------------------------------------

  const runEntry = useCallback(async () => {

    if (!gateCompleted || !gateSessionId) {
      setErrorMessage("Run Gate before Entry.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      validateGateEntryTimeframes();
      const body = buildEntryBody(gateSessionId);
      const data = await callAPI<{ results?: ScreenerResult[] }>("run-entry", body);

      const count = data.results?.length || 0;

      setEntryCompleted(true);
      setEntryCount(count);
      setResults(data.results || []);
      setLastResultContext({
        request: body,
        stage: "entry",
        timeframe: body.entry_timeframe || entryTimeframe,
      });

      setStatusMessage(
        `Entry completed. ${count} final symbols.`
      );

    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Entry scan failed");

    } finally {

      setLoading(false);

    }

  }, [
    gateCompleted,
    gateSessionId,
    buildEntryBody,
    callAPI,
    entryTimeframe,
    validateGateEntryTimeframes,
  ]);

  const runGateEntry = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setEntryCompleted(false);

    try {
      validateGateEntryTimeframes();

      const gateBody = buildGateBody();
      const gateData = await callAPI<{ results?: ScreenerResult[]; gate_session_id?: string | null }>("run-gate", gateBody);
      const gateResults = gateData.results || [];
      const gateSession = gateData.gate_session_id ?? null;
      const gateResultsCount = gateResults.length;

      setGateCompleted(true);
      setGateCount(gateResultsCount);
      setGateSessionId(gateSession);
      setResults(gateResults);
      setLastResultContext({
        request: gateBody,
        stage: "gate",
        timeframe: gateBody.gate_timeframe || gateTimeframe,
      });

      if (!gateSession || gateResultsCount === 0) {
        setEntryCompleted(true);
        setEntryCount(0);
        setStatusMessage(`Gate completed. ${gateResultsCount} symbols passed. Entry skipped.`);
        return;
      }

      const entryBody = buildEntryBody(gateSession);
      const entryData = await callAPI<{ results?: ScreenerResult[] }>("run-entry", entryBody);
      const entryResults = entryData.results || [];
      const entryResultsCount = entryResults.length;

      setEntryCompleted(true);
      setEntryCount(entryResultsCount);
      setResults(entryResults);
      setLastResultContext({
        request: entryBody,
        stage: "entry",
        timeframe: entryBody.entry_timeframe || entryTimeframe,
      });
      setStatusMessage(`Gate completed (${gateResultsCount}) -> Entry completed (${entryResultsCount}).`);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Gate-entry scan failed");
    } finally {
      setLoading(false);
    }
  }, [
    buildEntryBody,
    buildGateBody,
    callAPI,
    entryTimeframe,
    validateGateEntryTimeframes,
  ]);

  const fetchResultDetail = useCallback(async (result: ScreenerResult): Promise<ScreenerResultDetail> => {
    const context = lastResultContext ?? {
      request: buildRequest(),
      stage: (result.scan_stage || "single") as ScanStage,
      timeframe: result.timeframe,
    };

    const body: ScreenerDetailRequest = {
      symbol: result.symbol,
      asset_type: result.asset_type,
      timeframe: result.timeframe || context.timeframe,
      scan_stage: (result.scan_stage || context.stage || "single") as ScanStage,
      request: context.request,
    };

    const data = await callAPI<ScreenerDetailResponse>("details", body);

    if (!data.detail) {
      throw new Error("Asset detail unavailable.");
    }

    return data.detail;
  }, [buildRequest, callAPI, lastResultContext]);

  const DETAIL_EXPORT_CONCURRENCY = 4;

  const exportAllResultsDetails = useCallback(async (
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<ScreenerResultsBulkExport> => {
    if (!results.length) {
      throw new Error("No scan results to export. Run a scan first.");
    }

    const context = lastResultContext ?? {
      request: buildRequest(),
      stage: "single" as ScanStage,
      timeframe: singleTimeframe,
    };

    const exported: ScreenerResultExportEntry[] = [];
    let failedCount = 0;

    for (let index = 0; index < results.length; index += DETAIL_EXPORT_CONCURRENCY) {
      const chunk = results.slice(index, index + DETAIL_EXPORT_CONCURRENCY);
      const chunkEntries = await Promise.all(
        chunk.map(async (result): Promise<ScreenerResultExportEntry> => {
          try {
            const detail = await fetchResultDetail(result);
            return { summary: result, detail, error: null };
          } catch (error) {
            failedCount += 1;
            return {
              summary: result,
              detail: null,
              error: error instanceof Error ? error.message : "Asset detail unavailable.",
            };
          }
        }),
      );

      exported.push(...chunkEntries);
      onProgress?.(exported.length, results.length);
    }

    return {
      exported_at: new Date().toISOString(),
      scan_context: {
        stage: context.stage,
        timeframe: context.timeframe,
        request: context.request,
      },
      result_count: results.length,
      loaded_count: exported.filter((entry) => entry.detail !== null).length,
      failed_count: failedCount,
      results: exported,
    };
  }, [buildRequest, fetchResultDetail, lastResultContext, results, singleTimeframe]);


  // -------------------------------------------------------
  // RETURN
  // -------------------------------------------------------

  return {

    assetType,
    setAssetType: (v: AssetType) => {
      setAssetType(v);
      if (v !== "stocks") {
        setAssetCategories([]);
        setSectors([]);
      }
      resetGateEntry();
    },

    complianceStatus,
    setComplianceStatus: (v: ComplianceStatus | null) => {
      setComplianceStatus(v);
      resetGateEntry();
    },

    complianceStandards,
    setComplianceStandards: (v: string[]) => {
      setComplianceStandards(v);
      resetGateEntry();
    },

    assetCategories,
    setAssetCategories: (v: string[]) => {
      setAssetCategories(v);
      resetGateEntry();
    },
    sectors,
    setSectors: (v: string[]) => {
      setSectors(v);
      resetGateEntry();
    },
    availableStockAssetCategories,
    availableStockSectors,
    stockFilterOptionsLoading,

    excludedCategories,
    setExcludedCategories: (v: string[]) => {
      setExcludedCategories(v);
      resetGateEntry();
    },
    availableCryptoExchanges,
    cryptoExchangeOptionsLoading,
    cryptoExchanges,
    setCryptoExchanges: (v: string[]) => {
      setCryptoExchanges(
        normalizeCryptoExchangeSelection(v, cryptoExchangeNames(availableCryptoExchanges)),
      );
      resetGateEntry();
    },

    timeframeMode,
    setTimeframeMode: (v: TimeframeMode) => {
      setTimeframeMode(v);
      if (v === "gate_entry") {
        const normalizedPair = normalizeGateEntryPair(gateTimeframe, entryTimeframe);
        setGateTimeframe(normalizedPair.gate);
        setEntryTimeframe(normalizedPair.entry);
      }
      resetGateEntry();
    },

    singleTimeframe,
    setSingleTimeframe: (v: string) => {
      setSingleTimeframe(v);
      resetGateEntry();
    },

    gateTimeframe,
    setGateTimeframe: (v: string) => {
      const normalizedPair = normalizeGateEntryPair(v, entryTimeframe);
      setGateTimeframe(normalizedPair.gate);
      setEntryTimeframe(normalizedPair.entry);
      resetGateEntry();
    },

    entryTimeframe,
    setEntryTimeframe: (v: string) => {
      const normalizedPair = normalizeGateEntryPair(gateTimeframe, v);
      setGateTimeframe(normalizedPair.gate);
      setEntryTimeframe(normalizedPair.entry);
      resetGateEntry();
    },

    indicators,
    setIndicators: (v: IndicatorConfig[]) => {
      setIndicators(sanitizeIndicators(v));
      resetGateEntry();
    },

    channelRespect,
    setChannelRespect: (v: ChannelRespect | null) => {
      setChannelRespect(v);
      resetGateEntry();
    },

    confluence,
    setConfluence: (v: Confluence | null) => {
      setConfluence(normalizeConfluenceConfig(v));
      resetGateEntry();
    },

    priceRange,
    setPriceRange: (v: PriceRange | null) => {
      setPriceRange(v);
      resetGateEntry();
    },

    deadAssets,
    setDeadAssets: (v: DeadAssetsFilter | null) => {
      setDeadAssets(v);
      resetGateEntry();
    },

    results,
    loading,

    gateCompleted,
    gateCount,

    entryCompleted,
    entryCount,

    statusMessage,
    errorMessage,

    runSingle,
    runGate,
    runEntry,
    runGateEntry,
    fetchResultDetail,
    exportAllResultsDetails,

    getSnapshot,
    loadSnapshot,
    buildRequest,

  };
}
