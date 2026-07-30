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
  length: number;
}

export type RegressionChannelLine = "upper" | "q3" | "middle" | "q1" | "lower";

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
