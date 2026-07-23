import { describe, expect, it } from "vitest";
import type { MarketCandle } from "@/types/screener";
import {
  createLinearRegressionCandles,
  normalizeMarketCandles,
} from "./resultDetailChartData";

describe("result detail chart candle data", () => {
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
