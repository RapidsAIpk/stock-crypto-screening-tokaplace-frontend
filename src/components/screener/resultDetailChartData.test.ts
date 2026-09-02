import { describe, expect, it } from "vitest";
import type { MarketCandle } from "@/types/screener";
import {
  confluenceValueAt,
  createLinearRegressionCandles,
  filterCompletedCandles,
  normalizeConfluenceChartSources,
  normalizeLrcChannel,
  normalizeMarketCandles,
  normalizeRegressionChannel,
  normalizeTrendChannel,
  regressionValueAt,
  resolveChannelRespectHighlightTimes,
  resolveChartChannelVisibility,
  resolveConfluenceHighlightTimes,
  trendValueAt,
} from "./resultDetailChartData";

describe("resolveChartChannelVisibility", () => {
  it("shows channel charts from indicators alone", () => {
    expect(resolveChartChannelVisibility([
      { name: "regression" },
      { name: "trend" },
    ])).toEqual({ lrc: false, regression: true, trend: true });
  });

  it("shows channel charts when channel respect or confluence request them", () => {
    expect(resolveChartChannelVisibility([], {
      channel_respect: { channel_type: "trend" },
    })).toEqual({ lrc: false, regression: false, trend: true });

    expect(resolveChartChannelVisibility([], {
      confluence: {
        sources: [
          { channel_type: "regression" },
          { channel_type: "lrc" },
        ],
      },
    })).toEqual({ lrc: true, regression: true, trend: false });

    expect(resolveChartChannelVisibility([], {
      confluence: {
        channels: ["trend", "regression"],
      },
    })).toEqual({ lrc: false, regression: true, trend: true });
  });
});

describe("resolveChannelRespectHighlightTimes", () => {
  const filterDetails = [{
    name: "channel_respect",
    passed: true,
    details: { matched_candle_times: [1_000, 2_000_000_000_000] },
  }];

  it("returns backend-matched candle times only on the requested channel chart", () => {
    expect([...resolveChannelRespectHighlightTimes(filterDetails, {
      channel_respect: { channel_type: "regression" },
    }, "regression")]).toEqual([1_000, 2_000_000_000]);

    expect(resolveChannelRespectHighlightTimes(filterDetails, {
      channel_respect: { channel_type: "regression" },
    }, "price").size).toBe(0);
  });

  it("does not highlight candles for a failed channel respect detail", () => {
    expect(resolveChannelRespectHighlightTimes([{
      ...filterDetails[0],
      passed: false,
    }], {
      channel_respect: { channel_type: "regression" },
    }, "regression").size).toBe(0);
  });
});

describe("Confluence chart data", () => {
  it("normalizes the two configured source instances and selected line/zone", () => {
    const sources = normalizeConfluenceChartSources({
      fast_lrc: {
        channel_type: "lrc",
        channel: { lower: [10, 11], middle: [12, 13], upper: [14, 15] },
      },
      trend_zone: {
        channel_type: "trend",
        channel: {
          top_zone_lower: [20, 21],
          top_zone_upper: [22, 23],
        },
      },
    }, {
      confluence: {
        sources: [
          { id: "fast_lrc", channel_type: "lrc", selection: "lower" },
          { id: "trend_zone", channel_type: "trend", selection: "top_zone" },
        ],
      },
    });

    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({
      sourceId: "fast_lrc",
      selection: "lower",
      lower: [10, 11],
      upper: [10, 11],
      isZone: false,
    });
    expect(sources[1]).toMatchObject({
      sourceId: "trend_zone",
      selection: "top_zone",
      lower: [20, 21],
      upper: [22, 23],
      mid: [21, 22],
      isZone: true,
    });
    expect(confluenceValueAt(sources[1], "mid", 4, 5)).toBe(22);
  });

  it("uses only passed backend Confluence evidence for cyan outlines", () => {
    expect([...resolveConfluenceHighlightTimes([{
      name: "confluence",
      passed: true,
      details: { matched_candle_times: [1_000, 2_000_000_000_000] },
    }])]).toEqual([1_000, 2_000_000_000]);

    expect(resolveConfluenceHighlightTimes([{
      name: "confluence",
      passed: false,
      details: { matched_candle_times: [1_000] },
    }]).size).toBe(0);
  });
});

describe("result detail chart candle data", () => {
  it("normalizes LRC channel lines for charting", () => {
    expect(normalizeLrcChannel({
      lrc: {
        upper: [3, 4],
        middle: [2, 3],
        lower: [1, 2],
      },
    })).toMatchObject({
      upper: [3, 4],
      middle: [2, 3],
      lower: [1, 2],
      length: 2,
    });
  });

  it("aligns backend regression values to the last channel-length candles", () => {
    const channel = normalizeRegressionChannel({
      regression: {
        length: 3,
        upper: [11, 12, 13],
        middle: [10, 11, 12],
        lower: [9, 10, 11],
        tracer: [10.5, 11.25, 11.75],
      },
    });

    expect(channel).not.toBeNull();
    expect(regressionValueAt(channel!, "middle", 1, 5)).toBeNull();
    expect(regressionValueAt(channel!, "middle", 2, 5)).toBe(10);
    expect(regressionValueAt(channel!, "middle", 4, 5)).toBe(12);
    expect(regressionValueAt(channel!, "tracer", 4, 5)).toBe(11.75);
  });

  it("rejects incomplete regression series instead of drawing misaligned lines", () => {
    expect(normalizeRegressionChannel({
      regression: { length: 3, upper: [1, 2, 3], middle: [], lower: [1, 2, 3] },
    })).toBeNull();
  });

  it("aligns backend trend-channel values to the last channel-length candles", () => {
    const channel = normalizeTrendChannel({
      trend: {
        length: 3,
        top: [13, 14, 15],
        top_zone_lower: [12, 13, 14],
        top_zone_mid: [12.5, 13.5, 14.5],
        middle: [10, 11, 12],
        bottom_zone_upper: [8, 9, 10],
        bottom_zone_mid: [7.5, 8.5, 9.5],
        bottom: [7, 8, 9],
        direction: "up",
        broken: false,
      },
    });

    expect(channel).not.toBeNull();
    expect(channel).toMatchObject({ length: 3, direction: "up", broken: false });
    expect(trendValueAt(channel!, "middle", 1, 5)).toBeNull();
    expect(trendValueAt(channel!, "top", 2, 5)).toBe(13);
    expect(trendValueAt(channel!, "top_zone_mid", 4, 5)).toBe(14.5);
    expect(trendValueAt(channel!, "bottom_zone_mid", 4, 5)).toBe(9.5);
    expect(trendValueAt(channel!, "bottom", 4, 5)).toBe(9);
  });

  it("rejects incomplete trend channels and tolerates missing optional zone boundaries", () => {
    expect(normalizeTrendChannel({
      trend: { length: 3, top: [1, 2, 3], middle: [], bottom: [1, 2, 3] },
    })).toBeNull();

    const channel = normalizeTrendChannel({
      trend: {
        length: 2,
        top: [11, 12],
        middle: [10, 11],
        bottom: [9, 10],
      },
    });
    expect(channel?.top_zone_lower).toEqual([null, null]);
    expect(channel?.top_zone_mid).toEqual([null, null]);
    expect(channel?.bottom_zone_upper).toEqual([null, null]);
    expect(channel?.bottom_zone_mid).toEqual([null, null]);
  });

  it("normalizes Massive aggregate keys, milliseconds, ordering, and duplicates", () => {
    const candles = normalizeMarketCandles([
      { t: 2_000_000_000_000, o: 20, h: 23, l: 19, c: 22, v: 100 },
      { time: 1_000_000_000, open: 10, high: 12, low: 9, close: 11 },
      { t: 2_000_000_000_000, o: 21, h: 24, l: 20, c: 23, v: 150, is_closed: false },
      { time: 3, open: 10, high: 9, low: 8, close: 10 },
    ]);

    expect(candles).toHaveLength(2);
    expect(candles[0].time).toBe(1_000_000_000);
    expect(candles[1]).toMatchObject({
      time: 2_000_000_000,
      open: 21,
      high: 24,
      low: 20,
      close: 23,
      volume: 150,
      is_closed: false,
    });
  });

  it("filters out candles explicitly marked as not closed", () => {
    const candles: MarketCandle[] = [
      { time: 1_000, open: 10, high: 12, low: 9, close: 11, is_closed: true },
      { time: 1_060, open: 11, high: 13, low: 10, close: 12, is_closed: false },
    ];

    expect(filterCompletedCandles(candles, "1m", 1_200_000).map((candle) => candle.time)).toEqual([1_000]);
  });

  it("infers and removes the still-forming latest candle from the selected timeframe", () => {
    const candles: MarketCandle[] = [
      { time: 1_000, open: 10, high: 12, low: 9, close: 11 },
      { time: 1_060, open: 11, high: 13, low: 10, close: 12 },
      { time: 1_120, open: 12, high: 14, low: 11, close: 13 },
    ];

    expect(filterCompletedCandles(candles, "1m", 1_150_000).map((candle) => candle.time)).toEqual([1_000, 1_060]);
  });

  it("keeps the latest candle once its timeframe has completed", () => {
    const candles: MarketCandle[] = [
      { time: 1_000, open: 10, high: 12, low: 9, close: 11 },
      { time: 1_060, open: 11, high: 13, low: 10, close: 12 },
    ];

    expect(filterCompletedCandles(candles, "1m", 1_120_000).map((candle) => candle.time)).toEqual([1_000, 1_060]);
  });

  it("matches endpoint linear regression and SMA values and skips a forming bar", () => {
    const candles: MarketCandle[] = Array.from({ length: 7 }, (_, index) => ({
      time: index + 1,
      open: 10 + index * index,
      high: 12 + index * index,
      low: 9 + index * index,
      close: 11 + index * index,
      volume: 100 + index,
      is_closed: index !== 6,
    }));

    const result = createLinearRegressionCandles(candles, {
      lrLength: 3,
      signalSmoothing: 2,
      smaSignal: true,
      linReg: true,
    });

    expect(result).toHaveLength(4);
    expect(result.map((candle) => candle.time)).toEqual([3, 4, 5, 6]);
    expect(result[0].close).toBeCloseTo(14.6666666667, 8);
    expect(result[1].close).toBeCloseTo(19.6666666667, 8);
    expect(result[1].signal).toBeCloseTo(17.1666666667, 8);
    expect(result.at(-1)?.time).toBe(6);
  });
});
