import type { MarketCandle } from "@/types/screener";

export interface LinRegSettings {
  lrLength: number;
  signalSmoothing: number;
  smaSignal: boolean;
  linReg: boolean;
}

export interface ChartCandle extends MarketCandle {
  signal?: number;
}

export interface RegressionChannelSeries {
  upper: Array<number | null>;
  q3: Array<number | null>;
  middle: Array<number | null>;
  q1: Array<number | null>;
  lower: Array<number | null>;
  tracer: Array<number | null>;
  length: number;
}

export type RegressionChannelLine = "upper" | "q3" | "middle" | "q1" | "lower" | "tracer";

export interface TrendChannelSeries {
  top: Array<number | null>;
  top_zone_lower: Array<number | null>;
  top_zone_mid: Array<number | null>;
  middle: Array<number | null>;
  bottom_zone_upper: Array<number | null>;
  bottom_zone_mid: Array<number | null>;
  bottom: Array<number | null>;
  length: number;
  direction: "up" | "down" | null;
  broken: boolean;
}

export type TrendChannelLine =
  | "top"
  | "top_zone_lower"
  | "top_zone_mid"
  | "middle"
  | "bottom_zone_upper"
  | "bottom_zone_mid"
  | "bottom";

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeMarketCandles(
  rows: Array<MarketCandle | Record<string, unknown>>,
): MarketCandle[] {
  const byTime = new Map<number, MarketCandle>();

  for (const row of rows || []) {
    const source = row as Record<string, unknown>;
    const rawTime = finiteNumber(source.time ?? source.t ?? source.timestamp);
    const open = finiteNumber(source.open ?? source.o);
    const high = finiteNumber(source.high ?? source.h);
    const low = finiteNumber(source.low ?? source.l);
    const close = finiteNumber(source.close ?? source.c);

    if (
      rawTime === null
      || open === null
      || high === null
      || low === null
      || close === null
      || high < Math.max(open, close, low)
      || low > Math.min(open, close, high)
    ) {
      continue;
    }

    const time = rawTime > 10_000_000_000 ? Math.floor(rawTime / 1000) : Math.floor(rawTime);
    byTime.set(time, {
      time,
      open,
      high,
      low,
      close,
      volume: finiteNumber(source.volume ?? source.v),
      vwap: finiteNumber(source.vwap ?? source.vw),
      transactions: finiteNumber(source.transactions ?? source.n),
      is_closed: source.is_closed === false ? false : true,
    });
  }

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

export function normalizeRegressionChannel(
  channels: Record<string, unknown> | null | undefined,
): RegressionChannelSeries | null {
  const raw = channels?.regression;
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const normalizeSeries = (value: unknown): Array<number | null> => (
    Array.isArray(value)
      ? value.map((item) => item == null ? null : finiteNumber(item))
      : []
  );
  const upper = normalizeSeries(source.upper);
  const q3 = normalizeSeries(source.q3);
  const middle = normalizeSeries(source.middle);
  const q1 = normalizeSeries(source.q1);
  const lower = normalizeSeries(source.lower);
  const tracer = normalizeSeries(source.tracer);
  const availableLength = Math.min(upper.length, middle.length, lower.length);
  const configuredLength = Math.trunc(Number(source.length));
  const length = Number.isFinite(configuredLength) && configuredLength > 0
    ? Math.min(configuredLength, availableLength)
    : availableLength;

  if (length <= 0) return null;
  return {
    upper: upper.slice(-length),
    q3: q3.length >= length ? q3.slice(-length) : Array(length).fill(null),
    middle: middle.slice(-length),
    q1: q1.length >= length ? q1.slice(-length) : Array(length).fill(null),
    lower: lower.slice(-length),
    tracer: tracer.length >= length ? tracer.slice(-length) : Array(length).fill(null),
    length,
  };
}

export function normalizeLrcChannel(
  channels: Record<string, unknown> | null | undefined,
): RegressionChannelSeries | null {
  const raw = channels?.lrc;
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const normalizeSeries = (value: unknown): Array<number | null> => (
    Array.isArray(value)
      ? value.map((item) => item == null ? null : finiteNumber(item))
      : []
  );
  const upper = normalizeSeries(source.upper);
  const middle = normalizeSeries(source.middle);
  const lower = normalizeSeries(source.lower);
  const length = Math.min(upper.length, middle.length, lower.length);

  if (length <= 0) return null;
  return {
    upper: upper.slice(-length),
    q3: Array(length).fill(null),
    middle: middle.slice(-length),
    q1: Array(length).fill(null),
    lower: lower.slice(-length),
    tracer: Array(length).fill(null),
    length,
  };
}

export function regressionValueAt(
  channel: RegressionChannelSeries,
  line: RegressionChannelLine,
  candleIndex: number,
  candleCount: number,
): number | null {
  const channelIndex = candleIndex - (candleCount - channel.length);
  if (channelIndex < 0 || channelIndex >= channel.length) return null;
  return channel[line][channelIndex] ?? null;
}

export function normalizeTrendChannel(
  channels: Record<string, unknown> | null | undefined,
): TrendChannelSeries | null {
  const raw = channels?.trend;
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const normalizeSeries = (value: unknown): Array<number | null> => (
    Array.isArray(value)
      ? value.map((item) => item == null ? null : finiteNumber(item))
      : []
  );
  const top = normalizeSeries(source.top);
  const topZoneLower = normalizeSeries(source.top_zone_lower);
  const topZoneMid = normalizeSeries(source.top_zone_mid);
  const middle = normalizeSeries(source.middle);
  const bottomZoneUpper = normalizeSeries(source.bottom_zone_upper);
  const bottomZoneMid = normalizeSeries(source.bottom_zone_mid);
  const bottom = normalizeSeries(source.bottom);
  const availableLength = Math.min(top.length, middle.length, bottom.length);
  const configuredLength = Math.trunc(Number(source.length));
  const length = Number.isFinite(configuredLength) && configuredLength > 0
    ? Math.min(configuredLength, availableLength)
    : availableLength;

  if (length <= 0) return null;
  const optionalSeries = (series: Array<number | null>) => (
    series.length >= length ? series.slice(-length) : Array<number | null>(length).fill(null)
  );
  const rawDirection = String(source.direction ?? "").trim().toLowerCase();

  return {
    top: top.slice(-length),
    top_zone_lower: optionalSeries(topZoneLower),
    top_zone_mid: optionalSeries(topZoneMid),
    middle: middle.slice(-length),
    bottom_zone_upper: optionalSeries(bottomZoneUpper),
    bottom_zone_mid: optionalSeries(bottomZoneMid),
    bottom: bottom.slice(-length),
    length,
    direction: rawDirection === "up" || rawDirection === "down" ? rawDirection : null,
    broken: source.broken === true,
  };
}

export function trendValueAt(
  channel: TrendChannelSeries,
  line: TrendChannelLine,
  candleIndex: number,
  candleCount: number,
): number | null {
  const channelIndex = candleIndex - (candleCount - channel.length);
  if (channelIndex < 0 || channelIndex >= channel.length) return null;
  return channel[line][channelIndex] ?? null;
}

export interface ChartChannelVisibility {
  lrc: boolean;
  regression: boolean;
  trend: boolean;
}

export interface ConfluenceChartSource {
  sourceId: string;
  channelType: string;
  selection: string;
  length: number;
  lower: Array<number | null>;
  upper: Array<number | null>;
  mid: Array<number | null>;
  isZone: boolean;
}

function normalizedSeries(value: unknown): Array<number | null> {
  return Array.isArray(value)
    ? value.map((item) => item == null ? null : finiteNumber(item))
    : [];
}

function confluenceSelectionSeries(
  channelType: string,
  selection: string,
  channel: Record<string, unknown>,
): { lower: Array<number | null>; upper: Array<number | null>; isZone: boolean } | null {
  const normalizedType = channelType.trim().toLowerCase();
  const normalizedSelection = selection.trim().toLowerCase();

  if (normalizedType === "trend") {
    const mapping: Record<string, [string, string]> = {
      top_line: ["top", "top"],
      middle_line: ["middle", "middle"],
      bottom_line: ["bottom", "bottom"],
      top_zone: ["top_zone_lower", "top_zone_upper"],
      bottom_zone: ["bottom_zone_lower", "bottom_zone_upper"],
    };
    const names = mapping[normalizedSelection];
    if (!names) return null;
    const lower = normalizedSeries(channel[names[0]]);
    const upper = normalizedSeries(channel[names[1]]);
    return { lower, upper, isZone: names[0] !== names[1] };
  }

  const seriesName = ["upper", "middle", "lower"].includes(normalizedSelection)
    ? normalizedSelection
    : "lower";
  const line = normalizedSeries(channel[seriesName]);
  return { lower: line, upper: line, isZone: false };
}

export function normalizeConfluenceChartSources(
  confluenceChannels: Record<string, unknown> | null | undefined,
  requestFilters?: Record<string, unknown> | null,
): ConfluenceChartSource[] {
  if (!confluenceChannels || typeof confluenceChannels !== "object") return [];

  const config = requestFilters?.confluence;
  const configuredSources = config && typeof config === "object"
    && Array.isArray((config as Record<string, unknown>).sources)
    ? (config as Record<string, unknown>).sources as Array<Record<string, unknown>>
    : [];

  const entries = Object.entries(confluenceChannels);
  return entries.flatMap(([sourceId, rawPayload], fallbackIndex) => {
    if (!rawPayload || typeof rawPayload !== "object") return [];
    const payload = rawPayload as Record<string, unknown>;
    const channel = payload.channel;
    if (!channel || typeof channel !== "object") return [];

    const configured = configuredSources.find((source) => String(source.id || "") === sourceId)
      ?? configuredSources[fallbackIndex];
    const channelType = String(payload.channel_type ?? configured?.channel_type ?? "").trim().toLowerCase();
    const selection = String(payload.selection ?? configured?.selection ?? "").trim().toLowerCase();
    const selectedSeries = confluenceSelectionSeries(
      channelType,
      selection,
      channel as Record<string, unknown>,
    );
    if (!selectedSeries) return [];

    const length = Math.min(selectedSeries.lower.length, selectedSeries.upper.length);
    if (length <= 0) return [];
    const lower = selectedSeries.lower.slice(-length);
    const upper = selectedSeries.upper.slice(-length);
    const mid = lower.map((value, index) => {
      const upperValue = upper[index];
      return value === null || upperValue === null ? null : (value + upperValue) / 2;
    });

    return [{
      sourceId,
      channelType,
      selection,
      length,
      lower,
      upper,
      mid,
      isZone: selectedSeries.isZone,
    }];
  }).slice(0, 2);
}

export function confluenceValueAt(
  source: ConfluenceChartSource,
  line: "lower" | "upper" | "mid",
  candleIndex: number,
  candleCount: number,
): number | null {
  const sourceIndex = candleIndex - (candleCount - source.length);
  if (sourceIndex < 0 || sourceIndex >= source.length) return null;
  return source[line][sourceIndex] ?? null;
}

export function resolveConfluenceHighlightTimes(
  filterDetails: Array<{ name: string; passed: boolean; details: Record<string, unknown> }> = [],
): Set<number> {
  const detail = filterDetails.find((item) => item.name === "confluence" && item.passed);
  const rawTimes = detail?.details?.matched_candle_times;
  if (!Array.isArray(rawTimes)) return new Set();

  return new Set(rawTimes.flatMap((value) => {
    const parsed = finiteNumber(value);
    if (parsed === null) return [];
    return [parsed > 10_000_000_000 ? Math.floor(parsed / 1000) : Math.floor(parsed)];
  }));
}

// --------------------------------------------------------------
// Per-candle "why was this candle chosen" reasons, color-coded per
// filter/source so multiple filters can be told apart on the chart.
// --------------------------------------------------------------

export const CONFLUENCE_SOURCE_COLORS = ["#a78bfa", "#f59e0b"] as const;
export const CHANNEL_RESPECT_HIGHLIGHT_COLOR = "#00e5ff";
export const LIQUIDITY_SWEEP_HIGHLIGHT_COLOR = "#22d3ee";

export interface CandleMatchReason {
  color: string;
  label: string;
  detail: string;
}

export const ADR_HIGHLIGHT_COLOR = "#38bdf8";
export const ADR_ABOVE_AVERAGE_COLOR = "#22c55e";
export const ADR_BELOW_AVERAGE_COLOR = "#f97316";

export interface AdrChartWindow {
  candles: MarketCandle[];
  ranges: number[];
  adr: number;
  lookbackDays: number;
  condition: "gte" | "lte" | "between";
  minAdr: number | null;
  maxAdr: number | null;
  passed: boolean;
}

function adrCondition(value: unknown): "gte" | "lte" | "between" {
  const normalized = String(value ?? "gte").trim().toLowerCase();
  return normalized === "lte" || normalized === "between" ? normalized : "gte";
}

/**
 * The completed daily candles the ADR average was actually taken over.
 *
 * ADR is a daily-only measure by spec, so it is deliberately NOT drawn on the
 * scan's own timeframe candles - the backend ships the exact lookback window
 * it averaged, and the chart plots those bars instead.
 */
export function normalizeAdrChartWindow(
  filterDetails: Array<{ name: string; passed: boolean; details: Record<string, unknown> }> = [],
): AdrChartWindow | null {
  const detail = filterDetails.find((item) => item.name === "adr");
  if (!detail || detail.details?.applied === false) return null;

  const adr = finiteNumber(detail.details?.adr);
  const rawCandles = detail.details?.daily_candles;
  if (adr === null || !Array.isArray(rawCandles) || rawCandles.length === 0) return null;

  const candles = normalizeMarketCandles(rawCandles as Array<Record<string, unknown>>);
  if (!candles.length) return null;

  const lookbackDays = finiteNumber(detail.details?.lookback_days) ?? candles.length;

  return {
    candles,
    ranges: candles.map((candle) => candle.high - candle.low),
    adr,
    lookbackDays: Math.trunc(lookbackDays),
    condition: adrCondition(detail.details?.condition),
    minAdr: finiteNumber(detail.details?.min_adr),
    maxAdr: finiteNumber(detail.details?.max_adr),
    passed: Boolean(detail.passed),
  };
}

function formatDollars(value: number | null): string {
  return value === null ? "n/a" : `$${value.toFixed(2)}`;
}

export function adrThresholdLabel(window: AdrChartWindow): string {
  if (window.condition === "gte") return `minimum ${formatDollars(window.minAdr)}`;
  if (window.condition === "lte") return `maximum ${formatDollars(window.maxAdr)}`;
  return `${formatDollars(window.minAdr)} – ${formatDollars(window.maxAdr)}`;
}

/**
 * Every candle in the lookback window is evidence for ADR - the average is
 * taken over all of them, so all of them are highlighted. The per-candle
 * tooltip carries that day's own High-Low range and how it sits against the
 * average, which is what actually explains the number.
 */
export function resolveAdrCandleReasons(
  window: AdrChartWindow | null,
): Map<number, CandleMatchReason[]> {
  const reasons = new Map<number, CandleMatchReason[]>();
  if (!window) return reasons;

  const thresholdLabel = adrThresholdLabel(window);

  window.candles.forEach((candle, index) => {
    const candleRange = window.ranges[index];
    const aboveAverage = candleRange >= window.adr;

    addCandleReason(reasons, candle.time, {
      color: aboveAverage ? ADR_ABOVE_AVERAGE_COLOR : ADR_BELOW_AVERAGE_COLOR,
      label: `Day ${index + 1} of ${window.lookbackDays} — range ${formatDollars(candleRange)}`,
      detail: (
        `High ${formatDollars(candle.high)} − Low ${formatDollars(candle.low)} = `
        + `${formatDollars(candleRange)}, ${aboveAverage ? "at or above" : "below"} the `
        + `${window.lookbackDays}-day average of ${formatDollars(window.adr)} `
        + `(${thresholdLabel}).`
      ),
    });
  });

  return reasons;
}

const CONFLUENCE_SCENARIO_LABELS: Record<string, string> = {
  dual_support: "Dual Support",
  stacked_support: "Stacked Support",
  dual_resistance_break: "Dual Resistance Break",
  support_then_resistance_break: "Support Then Break",
  resistance_break_then_support: "Break Then Support",
  role_reversal: "Role Reversal",
  stacked_resistance: "Stacked Resistance",
  clustered_resistance: "Clustered Resistance",
};

function confluenceScenarioLabel(scenario: unknown): string {
  const key = String(scenario ?? "").trim().toLowerCase();
  return CONFLUENCE_SCENARIO_LABELS[key] ?? "Channel Confluence";
}

function formatChannelTypeLabel(channelType: string): string {
  const normalized = channelType.trim().toLowerCase();
  if (normalized === "lrc") return "LRC";
  if (normalized === "regression") return "Regression Channel";
  if (normalized === "trend") return "Trend Channel";
  return channelType;
}

function normalizedCandleTime(value: unknown): number | null {
  const parsed = finiteNumber(value);
  if (parsed === null) return null;
  return parsed > 10_000_000_000 ? Math.floor(parsed / 1000) : Math.floor(parsed);
}

function addCandleReason(
  reasons: Map<number, CandleMatchReason[]>,
  time: number,
  reason: CandleMatchReason,
): void {
  const existing = reasons.get(time) ?? [];
  if (existing.some((item) => item.label === reason.label && item.detail === reason.detail)) {
    return;
  }
  reasons.set(time, [...existing, reason]);
}

/**
 * Builds a per-candle-time map of *why* each candle was highlighted by the
 * Channel Confluence filter: which source (with its own color) confirmed
 * its line there, under which scenario, plus any liquidity-sweep candle.
 */
export function resolveConfluenceCandleReasons(
  filterDetails: Array<{ name: string; passed: boolean; details: Record<string, unknown> }> = [],
  confluenceSources: ConfluenceChartSource[] = [],
): Map<number, CandleMatchReason[]> {
  const reasons = new Map<number, CandleMatchReason[]>();
  const detail = filterDetails.find((item) => item.name === "confluence" && item.passed);
  if (!detail) return reasons;

  const scenarioLabel = confluenceScenarioLabel(detail.details?.match_scenario);
  const colorBySource = new Map(
    confluenceSources.map((source, index) => [
      source.sourceId,
      CONFLUENCE_SOURCE_COLORS[index] ?? CONFLUENCE_SOURCE_COLORS[0],
    ]),
  );

  const sourceMatches = Array.isArray(detail.details?.source_matches)
    ? (detail.details.source_matches as Array<Record<string, unknown>>)
    : [];

  sourceMatches.forEach((match, index) => {
    const time = normalizedCandleTime(match.candle_time);
    if (time === null) return;

    const sourceId = String(match.source_id ?? "");
    const channelType = String(match.channel_type ?? "");
    const selection = String(match.selection ?? "").replace(/_/g, " ");
    const color = colorBySource.get(sourceId) ?? CONFLUENCE_SOURCE_COLORS[index] ?? CONFLUENCE_SOURCE_COLORS[0];

    addCandleReason(reasons, time, {
      color,
      label: `Source ${index + 1} — ${formatChannelTypeLabel(channelType)} ${selection}`,
      detail: `${scenarioLabel}: Source ${index + 1} confirmed its line on this candle.`,
    });
  });

  const matchedIndexes = Array.isArray(detail.details?.matched_candle_indexes)
    ? (detail.details.matched_candle_indexes as unknown[])
    : [];
  const matchedTimes = Array.isArray(detail.details?.matched_candle_times)
    ? (detail.details.matched_candle_times as unknown[])
    : [];
  const sourceMatchIndexes = new Set(
    sourceMatches.map((match) => finiteNumber(match.candle_index)),
  );

  matchedIndexes.forEach((rawIndex, position) => {
    const index = finiteNumber(rawIndex);
    if (index === null || sourceMatchIndexes.has(index)) return;
    const time = normalizedCandleTime(matchedTimes[position]);
    if (time === null) return;

    addCandleReason(reasons, time, {
      color: LIQUIDITY_SWEEP_HIGHLIGHT_COLOR,
      label: "Liquidity Sweep",
      detail: "Price swept liquidity beyond the line before confluence was confirmed.",
    });
  });

  return reasons;
}

/**
 * Builds a per-candle-time map of *why* each candle was highlighted by the
 * Channel Respect filter, for the currently displayed channel chart.
 */
export function resolveChannelRespectCandleReasons(
  filterDetails: Array<{ name: string; passed: boolean; details: Record<string, unknown> }> = [],
  requestFilters?: Record<string, unknown> | null,
  mode?: string,
): Map<number, CandleMatchReason[]> {
  const reasons = new Map<number, CandleMatchReason[]>();
  const channelRespect = requestFilters?.channel_respect;
  if (!channelRespect || typeof channelRespect !== "object") return reasons;

  const channelType = String(
    (channelRespect as Record<string, unknown>).channel_type || "",
  ).trim().toLowerCase();
  if (!channelType || channelType !== mode) return reasons;

  const line = String((channelRespect as Record<string, unknown>).line || "middle").replace(/_/g, " ");
  const detail = filterDetails.find((item) => item.name === "channel_respect" && item.passed);
  const rawTimes = detail?.details?.matched_candle_times;
  if (!Array.isArray(rawTimes)) return reasons;

  rawTimes.forEach((value) => {
    const time = normalizedCandleTime(value);
    if (time === null) return;

    addCandleReason(reasons, time, {
      color: CHANNEL_RESPECT_HIGHLIGHT_COLOR,
      label: "Channel Respect",
      detail: `Price touched the ${formatChannelTypeLabel(channelType)} ${line} line/zone.`,
    });
  });

  return reasons;
}

export function resolveChannelRespectHighlightTimes(
  filterDetails: Array<{ name: string; passed: boolean; details: Record<string, unknown> }> = [],
  requestFilters?: Record<string, unknown> | null,
  mode?: string,
): Set<number> {
  const channelRespect = requestFilters?.channel_respect;
  if (!channelRespect || typeof channelRespect !== "object") return new Set();

  const channelType = String(
    (channelRespect as Record<string, unknown>).channel_type || "",
  ).trim().toLowerCase();
  if (!channelType || channelType !== mode) return new Set();

  const detail = filterDetails.find((item) => item.name === "channel_respect" && item.passed);
  const rawTimes = detail?.details?.matched_candle_times;
  if (!Array.isArray(rawTimes)) return new Set();

  return new Set(rawTimes.flatMap((value) => {
    const parsed = finiteNumber(value);
    if (parsed === null) return [];
    return [parsed > 10_000_000_000 ? Math.floor(parsed / 1000) : Math.floor(parsed)];
  }));
}

function collectRequestedChannelTypes(requestFilters?: Record<string, unknown> | null): Set<string> {
  const channelTypes = new Set<string>();

  const channelRespect = requestFilters?.channel_respect;
  if (channelRespect && typeof channelRespect === "object") {
    const channelType = String((channelRespect as Record<string, unknown>).channel_type || "").trim().toLowerCase();
    if (channelType) {
      channelTypes.add(channelType);
    }
  }

  const confluence = requestFilters?.confluence;
  if (confluence && typeof confluence === "object") {
    const config = confluence as Record<string, unknown>;
    const sources = Array.isArray(config.sources) ? config.sources : [];
    for (const source of sources) {
      if (!source || typeof source !== "object") {
        continue;
      }
      const channelType = String((source as Record<string, unknown>).channel_type || "").trim().toLowerCase();
      if (channelType) {
        channelTypes.add(channelType);
      }
    }

    const channels = Array.isArray(config.channels) ? config.channels : [];
    for (const channelType of channels) {
      const normalized = String(channelType || "").trim().toLowerCase();
      if (normalized) {
        channelTypes.add(normalized);
      }
    }
  }

  return channelTypes;
}

export function resolveChartChannelVisibility(
  indicatorDetails: Array<{ name: string }>,
  requestFilters?: Record<string, unknown> | null,
): ChartChannelVisibility {
  const indicatorNames = new Set(indicatorDetails.map((item) => item.name));
  const requestedChannelTypes = collectRequestedChannelTypes(requestFilters);

  return {
    lrc: indicatorNames.has("lrc") || requestedChannelTypes.has("lrc"),
    regression: indicatorNames.has("regression") || requestedChannelTypes.has("regression"),
    trend: indicatorNames.has("trend") || requestedChannelTypes.has("trend"),
  };
}

function rollingLinearRegression(values: number[], length: number): number[] {
  const output = Array(values.length).fill(Number.NaN);
  if (length <= 0 || values.length < length) return output;

  const sumX = (length * (length - 1)) / 2;
  const sumXX = (length * (length - 1) * (2 * length - 1)) / 6;
  const denominator = length * sumXX - sumX * sumX;

  for (let index = length - 1; index < values.length; index += 1) {
    const start = index - length + 1;
    let sumY = 0;
    let sumXY = 0;
    for (let offset = 0; offset < length; offset += 1) {
      const value = values[start + offset];
      sumY += value;
      sumXY += offset * value;
    }
    const slope = denominator === 0 ? 0 : (length * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / length;
    output[index] = intercept + slope * (length - 1);
  }

  return output;
}

function simpleMovingAverage(values: number[], length: number): number[] {
  const output = Array(values.length).fill(Number.NaN);
  for (let index = length - 1; index < values.length; index += 1) {
    const window = values.slice(index - length + 1, index + 1);
    if (window.every(Number.isFinite)) {
      output[index] = window.reduce((total, value) => total + value, 0) / length;
    }
  }
  return output;
}

function exponentialMovingAverage(values: number[], length: number): number[] {
  const output = Array(values.length).fill(Number.NaN);
  if (!values.length || length <= 0) return output;

  const multiplier = 2 / (length + 1);
  output[0] = values[0];
  for (let index = 1; index < values.length; index += 1) {
    const previous = Number.isFinite(output[index - 1]) ? output[index - 1] : values[index];
    output[index] = (values[index] - previous) * multiplier + previous;
  }
  return output;
}

export function createLinearRegressionCandles(
  candles: MarketCandle[],
  settings: LinRegSettings,
): ChartCandle[] {
  const closed = candles.filter((candle) => candle.is_closed !== false);
  const field = (key: "open" | "high" | "low" | "close") => {
    const values = closed.map((candle) => candle[key]);
    return settings.linReg ? rollingLinearRegression(values, settings.lrLength) : values;
  };
  const opens = field("open");
  const highs = field("high");
  const lows = field("low");
  const closes = field("close");
  const signal = settings.smaSignal
    ? simpleMovingAverage(closes, settings.signalSmoothing)
    : exponentialMovingAverage(closes, settings.signalSmoothing);

  return closed.flatMap((candle, index) => {
    if (![opens[index], highs[index], lows[index], closes[index]].every(Number.isFinite)) return [];
    return [{
      ...candle,
      open: opens[index],
      high: highs[index],
      low: lows[index],
      close: closes[index],
      signal: Number.isFinite(signal[index]) ? signal[index] : undefined,
    }];
  });
}
