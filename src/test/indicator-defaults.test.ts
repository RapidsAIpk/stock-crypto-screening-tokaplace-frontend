import { beforeEach, describe, expect, it } from "vitest";

import {
  describeChannelRespectCandleWindow,
  getChannelRespectHistoryCandleCount,
  getChannelRespectTouchCandleCount,
  getDefaultChannelLength,
  getDefaultIndicatorConfig,
  normalizeIndicatorConfig,
  resolveChannelRespectChannelLength,
} from "@/types/screener";

describe("indicator defaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses TradingView-style defaults for EMA and channel indicators", () => {
    expect(getDefaultIndicatorConfig("ema")).toMatchObject({ length: 9 });
    expect(getDefaultIndicatorConfig("lrc")).toMatchObject({ length: 100 });
    expect(getDefaultIndicatorConfig("regression")).toMatchObject({ length: 200 });
    expect(getDefaultIndicatorConfig("trend")).toMatchObject({
      length: 8,
      show_last_channel: true,
      wait_for_break: true,
    });
  });

  it("uses the same default channel lengths in confluence helpers", () => {
    expect(getDefaultChannelLength("lrc")).toBe(100);
    expect(getDefaultChannelLength("regression")).toBe(200);
    expect(getDefaultChannelLength("trend")).toBe(8);
  });

  it("describes channel respect candle windows for each channel type", () => {
    expect(getChannelRespectTouchCandleCount("lrc")).toBe(100);
    expect(getChannelRespectHistoryCandleCount("lrc")).toBe(100);
    expect(getChannelRespectTouchCandleCount("regression")).toBe(200);
    expect(getChannelRespectHistoryCandleCount("regression")).toBe(399);
    expect(getChannelRespectTouchCandleCount("trend")).toBeNull();
    expect(getChannelRespectHistoryCandleCount("trend")).toBe(500);

    expect(
      describeChannelRespectCandleWindow({ channel_type: "regression" }).touchLabel,
    ).toContain("200");

    expect(
      describeChannelRespectCandleWindow(
        { channel_type: "trend" },
        [{ name: "trend", timeframe: "single", config: { length: 12 } }],
      ).detail,
    ).toContain("12");
    expect(resolveChannelRespectChannelLength("trend", [
      { name: "trend", timeframe: "single", config: { length: 12 } },
    ])).toBe(12);
  });

  it("fills missing indicator config from the updated defaults", () => {
    expect(
      normalizeIndicatorConfig({
        name: "ema",
        timeframe: "single",
        config: { rule: "below" },
      }),
    ).toMatchObject({
      config: {
        length: 9,
        rule: "below",
      },
    });
  });
});
