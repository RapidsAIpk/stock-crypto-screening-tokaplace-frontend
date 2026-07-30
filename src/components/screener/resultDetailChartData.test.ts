import { describe, expect, it } from "vitest";
import type { MarketCandle } from "@/types/screener";
import {
  createLinearRegressionCandles,
  normalizeMarketCandles,
  normalizeRegressionChannel,
  normalizeTrendChannel,
  regressionValueAt,
  trendValueAt,
} from "./resultDetailChartData";

describe("result detail chart candle data", () => {
  it("aligns backend regression values to the last channel-length candles", () => {
    const channel = normalizeRegressionChannel({
      regression: {
        length: 3,
        upper: [11, 12, 13],
        middle: [10, 11, 12],
        lower: [9, 10, 11],
      },
    });

    expect(channel).not.toBeNull();
    expect(regressionValueAt(channel!, "middle", 1, 5)).toBeNull();
    expect(regressionValueAt(channel!, "middle", 2, 5)).toBe(10);
    expect(regressionValueAt(channel!, "middle", 4, 5)).toBe(12);
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
