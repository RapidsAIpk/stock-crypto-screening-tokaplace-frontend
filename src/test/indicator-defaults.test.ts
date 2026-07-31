import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScreener } from "@/hooks/useScreener";
import {
  describeChannelRespectCandleWindow,
  getChannelRespectHistoryCandleCount,
  getChannelRespectTouchCandleCount,
  getDefaultChannelLength,
  getDefaultIndicatorConfig,
  INDICATOR_DEFINITIONS,
  normalizeIndicatorConfig,
  resolveChannelRespectChannelLength,
} from "@/types/screener";

describe("indicator defaults", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ exchanges: [], asset_categories: [], sectors: [] }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("uses TradingView Volume Spikes [TFO] defaults for Volume Spike", () => {
    expect(getDefaultIndicatorConfig("volume")).toEqual({
      vol_x: 1.5,
      vol_ma: 100,
      only_valid_hl: true,
      only_hammers_shooters: true,
      only_same_color: false,
      session: "0000-0000",
      rule: "either",
      window: 1,
      tolerance_pct: 0,
    });
  });

  it("shows Volume Spike TradingView fields and hides legacy alias fields", () => {
    const fields = INDICATOR_DEFINITIONS.find((item) => item.name === "volume")?.fields ?? [];
    const keys = fields.map((field) => field.key);

    expect(keys).toEqual([
      "vol_x",
      "vol_ma",
      "only_valid_hl",
      "only_hammers_shooters",
      "only_same_color",
      "session",
    ]);
    expect(keys).not.toContain("length");
    expect(keys).not.toContain("multiplier");
    expect(keys).not.toContain("volume_length");
    expect(keys).not.toContain("volume_threshold");
    expect(keys).not.toContain("min_ratio");
    expect(keys).not.toContain("min_volume");
    expect(keys).not.toContain("max_volume");
    expect(keys).not.toContain("rule");
    expect(keys).not.toContain("window");
    expect(keys).not.toContain("tolerance_pct");
  });

  it("sends the exact default Volume Spike config in the built request", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        {
          name: "volume",
          timeframe: "single",
          config: getDefaultIndicatorConfig("volume"),
        },
      ]);
    });

    expect(result.current.buildRequest().indicators[0]).toEqual({
      name: "volume",
      timeframe: "single",
      config: {
        vol_x: 1.5,
        vol_ma: 100,
        only_valid_hl: true,
        only_hammers_shooters: true,
        only_same_color: false,
        session: "0000-0000",
        rule: "either",
        window: 1,
        tolerance_pct: 0,
      },
    });
  });

  it("normalizes old Volume Spike aliases into TradingView-native keys", () => {
    const normalized = normalizeIndicatorConfig({
      name: "volume",
      timeframe: "single",
      config: {
        length: 24,
        multiplier: 2,
        volume_length: 10,
        volume_threshold: 3,
        min_ratio: 1.2,
        min_volume: 100000,
        max_volume: 5000000,
        tolerance_pct: 0.2,
      },
    });

    expect(normalized.config).toEqual({
      vol_x: 2,
      vol_ma: 24,
      only_valid_hl: true,
      only_hammers_shooters: true,
      only_same_color: false,
      session: "0000-0000",
      rule: "either",
      window: 1,
      tolerance_pct: 0.2,
    });
  });

  it("uses TradingView WT_CROSS_LB defaults for WaveTrend", () => {
    expect(getDefaultIndicatorConfig("wavetrend")).toEqual({
      mode: "wt_cross_lb",
      channel_length: 10,
      average_length: 21,
      signal_length: 4,
      overbought_level_1: 60,
      overbought_level_2: 53,
      oversold_level_1: -60,
      oversold_level_2: -53,
      condition: "cross_any",
      zone: "any",
      window: 1,
      tolerance_pct: 0,
      confirmation: false,
    });
  });

  it("shows WaveTrend WT_CROSS_LB fields and hides legacy threshold fields", () => {
    const fields = INDICATOR_DEFINITIONS.find((item) => item.name === "wavetrend")?.fields ?? [];
    const keys = fields.map((field) => field.key);

    expect(keys).toEqual([
      "channel_length",
      "average_length",
      "overbought_level_1",
      "overbought_level_2",
      "oversold_level_1",
      "oversold_level_2",
      "signal_length",
      "condition",
      "zone",
      "window",
      "tolerance_pct",
      "confirmation",
      "confirmation_types",
      "confirmation_patterns",
    ]);
    expect(keys).not.toContain("threshold");
    expect(keys).not.toContain("direction");
    expect(fields.find((field) => field.key === "signal_length")?.section).toBe("Advanced Screening");
    expect(fields.find((field) => field.key === "condition")?.label).toBe("Condition");
    expect(fields.find((field) => field.key === "window")?.label).toBe("Window");
  });

  it("sends the exact default WaveTrend WT_CROSS_LB config in the built request", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        {
          name: "wavetrend",
          timeframe: "single",
          config: getDefaultIndicatorConfig("wavetrend"),
        },
      ]);
    });

    expect(result.current.buildRequest().indicators[0]).toEqual({
      name: "wavetrend",
      timeframe: "single",
      config: {
        mode: "wt_cross_lb",
        channel_length: 10,
        average_length: 21,
        signal_length: 4,
        overbought_level_1: 60,
        overbought_level_2: 53,
        oversold_level_1: -60,
        oversold_level_2: -53,
        condition: "cross_any",
        zone: "any",
        window: 1,
        tolerance_pct: 0,
        confirmation: false,
      },
    });
  });

  it("normalizes old WaveTrend direction configs into WT_CROSS_LB condition", () => {
    const normalized = normalizeIndicatorConfig({
      name: "wavetrend",
      timeframe: "single",
      config: {
        threshold: 35,
        zone: "oversold",
        direction: "crossed_up",
        tolerance_pct: 0.2,
      },
    });

    expect(normalized.config).toEqual({
      mode: "wt_cross_lb",
      channel_length: 10,
      average_length: 21,
      signal_length: 4,
      overbought_level_1: 60,
      overbought_level_2: 53,
      oversold_level_1: -60,
      oversold_level_2: -53,
      condition: "cross_up",
      zone: "oversold",
      window: 1,
      tolerance_pct: 0.2,
      confirmation: false,
    });
  });

  it("uses TradingView Trendy ADX defaults", () => {
    expect(getDefaultIndicatorConfig("adx")).toEqual({
      length: 11,
      threshold: 20,
      show_background_colors: false,
      use_dark_theme: false,
      top_level: 19,
      rising_level: 10,
      up_level: 4,
      down_level: -4,
      falling_level: -10,
      bottom_level: -19,
      rule: "adx_above",
      window: 1,
      min_history: 200,
    });
  });

  it("shows Trendy ADX TradingView fields before Advanced Screening", () => {
    const fields = INDICATOR_DEFINITIONS.find((item) => item.name === "adx")?.fields ?? [];
    const keys = fields.map((field) => field.key);

    expect(keys).toEqual([
      "length",
      "threshold",
      "show_background_colors",
      "use_dark_theme",
      "top_level",
      "rising_level",
      "up_level",
      "down_level",
      "falling_level",
      "bottom_level",
      "rule",
      "window",
      "min_history",
      "mode",
      "conditions",
    ]);
    expect(fields.find((field) => field.key === "threshold")?.label).toBe("Threshold");
    expect(fields.find((field) => field.key === "top_level")?.label).toBe("Top Level");
    expect(fields.find((field) => field.key === "rising_level")?.label).toBe("Rising Level");
    expect(fields.find((field) => field.key === "up_level")?.label).toBe("Up Level");
    expect(fields.find((field) => field.key === "down_level")?.label).toBe("Down Level");
    expect(fields.find((field) => field.key === "falling_level")?.label).toBe("Falling Level");
    expect(fields.find((field) => field.key === "bottom_level")?.label).toBe("Bottom Level");
    expect(fields.find((field) => field.key === "rule")?.label).toBe("Screening Rule");
    expect(fields.find((field) => field.key === "rule")?.section).toBe("Advanced Screening");
    expect(fields.find((field) => field.key === "min_history")?.section).toBe("Advanced Screening");
    expect(fields.find((field) => field.key === "mode")?.section).toBe("Advanced Screening");
    expect(fields.find((field) => field.key === "conditions")?.section).toBe("Advanced Screening");
  });

  it("sends the exact default Trendy ADX config in the built request", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        {
          name: "adx",
          timeframe: "single",
          config: getDefaultIndicatorConfig("adx"),
        },
      ]);
    });

    expect(result.current.buildRequest().indicators[0]).toEqual({
      name: "adx",
      timeframe: "single",
      config: {
        length: 11,
        threshold: 20,
        show_background_colors: false,
        use_dark_theme: false,
        top_level: 19,
        rising_level: 10,
        up_level: 4,
        down_level: -4,
        falling_level: -10,
        bottom_level: -19,
        rule: "adx_above",
        window: 1,
        min_history: 200,
      },
    });
  });

  it("keeps advanced Trendy ADX mode and conditions when configured", () => {
    const normalized = normalizeIndicatorConfig({
      name: "adx",
      timeframe: "single",
      config: {
        mode: "bullish",
        conditions: [{ id: "adx_above_20" }],
        rule: "buy_signal",
        window: 2,
      },
    });

    expect(normalized.config).toMatchObject({
      length: 11,
      threshold: 20,
      rule: "buy_signal",
      window: 2,
      min_history: 200,
      mode: "bullish",
      conditions: [{ id: "adx_above_20" }],
    });
  });

  it("uses TradingView-style defaults for Relative Volume", () => {
    expect(getDefaultIndicatorConfig("relative_volume")).toEqual({
      length: 30,
      lsma_length: 50,
      min_ratio: 1.5,
      max_ratio: null,
      rule: "above",
      window: 1,
      vol_alert: 200000000,
      show_lsma_21: true,
      show_lsma_6: true,
      show_anomalies: true,
      tolerance_pct: 0,
    });
  });

  it("preserves the full Relative Volume config in the built request", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        {
          name: "relative_volume",
          timeframe: "single",
          config: {
            length: 30,
            lsma_length: 50,
            rule: "crossed_above",
            window: 3,
            vol_alert: 200000000,
            show_lsma_21: true,
            show_lsma_6: false,
            show_anomalies: true,
            min_ratio: 2,
            max_ratio: 5,
            tolerance_pct: 0,
          },
        },
      ]);
    });

    expect(result.current.buildRequest().indicators[0].config).toMatchObject({
      length: 30,
      lsma_length: 50,
      rule: "crossed_above",
      window: 3,
      vol_alert: 200000000,
      show_lsma_21: true,
      show_lsma_6: false,
      show_anomalies: true,
      min_ratio: 2,
      max_ratio: 5,
      tolerance_pct: 0,
    });
  });

  it("normalizes old Relative Volume configs while keeping legacy keys intact", () => {
    const normalized = normalizeIndicatorConfig({
      name: "relative_volume",
      timeframe: "single",
      config: {
        length: 20,
        min_ratio: 1.8,
        tolerance_pct: 0,
      },
    });

    expect(normalized.config).toMatchObject({
      length: 20,
      lsma_length: 50,
      min_ratio: 1.8,
      max_ratio: null,
      rule: "above",
      window: 1,
      vol_alert: 200000000,
      show_lsma_21: true,
      show_lsma_6: true,
      show_anomalies: true,
      tolerance_pct: 0,
    });
    expect(normalized.config).not.toHaveProperty("avg_length");
  });

  it("uses TradingView-style defaults for Current Volume", () => {
    expect(getDefaultIndicatorConfig("current_volume")).toEqual({
      enable_percentage_on_chart: true,
      atr_length: 14,
      smoothing: "RMA",
      atr_multiplier: 0.5,
      avg_count: 30,
      tolerance_pct: 0,
    });
  });

  it("shows only TradingView calculation fields in the Current Volume UI", () => {
    const fields = INDICATOR_DEFINITIONS.find((item) => item.name === "current_volume")?.fields ?? [];

    expect(fields.map((field) => field.key)).toEqual([
      "enable_percentage_on_chart",
      "atr_length",
      "smoothing",
      "atr_multiplier",
      "avg_count",
    ]);
  });

  it("sends the exact default Current Volume config in the built request", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        {
          name: "current_volume",
          timeframe: "single",
          config: getDefaultIndicatorConfig("current_volume"),
        },
      ]);
    });

    expect(result.current.buildRequest().indicators[0]).toEqual({
      name: "current_volume",
      timeframe: "single",
      config: {
        enable_percentage_on_chart: true,
        atr_length: 14,
        smoothing: "RMA",
        atr_multiplier: 0.5,
        avg_count: 30,
        tolerance_pct: 0,
      },
    });
  });

  it("normalizes old Current Volume screening configs without dropping min/max filters", () => {
    const normalized = normalizeIndicatorConfig({
      name: "current_volume",
      timeframe: "single",
      config: {
        min_value: 100000,
        max_value: 5000000,
        tolerance_pct: 0,
      },
    });

    expect(normalized.config).toEqual({
      enable_percentage_on_chart: true,
      atr_length: 14,
      smoothing: "RMA",
      atr_multiplier: 0.5,
      avg_count: 30,
      tolerance_pct: 0,
      min_value: 100000,
      max_value: 5000000,
    });
  });

  it("uses TradingView VStop MTF defaults for Volatility", () => {
    expect(getDefaultIndicatorConfig("volatility")).toEqual({
      mode: "vstop",
      source: "close",
      length: 20,
      atr_factor: 2,
      htf_selection: "Multiple Of Current TF",
      htf_multiple: 3,
      fixed_timeframe: "1D",
      detect_breaches: true,
      repainting_htf: false,
      rule: "threshold",
      window: 1,
      trend_reversal_alert: false,
      change_to_uptrend_alert: false,
      change_to_downtrend_alert: false,
      chart_breach_downtrend_alert: false,
      chart_breach_uptrend_alert: false,
      delay_minutes: 0,
      alert_frequency: "once_per_bar",
    });
  });

  it("shows VStop MTF fields instead of legacy percentage volatility fields", () => {
    const fields = INDICATOR_DEFINITIONS.find((item) => item.name === "volatility")?.fields ?? [];
    const keys = fields.map((field) => field.key);

    expect(keys).toEqual([
      "source",
      "length",
      "atr_factor",
      "htf_selection",
      "htf_multiple",
      "fixed_timeframe",
      "detect_breaches",
      "repainting_htf",
      "rule",
      "window",
      "trend_reversal_alert",
      "change_to_uptrend_alert",
      "change_to_downtrend_alert",
      "chart_breach_downtrend_alert",
      "chart_breach_uptrend_alert",
      "delay_minutes",
      "alert_frequency",
    ]);
    expect(keys).not.toContain("min_pct");
    expect(keys).not.toContain("max_pct");
    expect(keys).not.toContain("tolerance_pct");
  });

  it("sends the exact default Volatility VStop config in the built request", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        {
          name: "volatility",
          timeframe: "single",
          config: getDefaultIndicatorConfig("volatility"),
        },
      ]);
    });

    expect(result.current.buildRequest().indicators[0]).toEqual({
      name: "volatility",
      timeframe: "single",
      config: {
        mode: "vstop",
        source: "close",
        length: 20,
        atr_factor: 2,
        htf_selection: "Multiple Of Current TF",
        htf_multiple: 3,
        fixed_timeframe: "1D",
        detect_breaches: true,
        repainting_htf: false,
        rule: "threshold",
        window: 1,
        trend_reversal_alert: false,
        change_to_uptrend_alert: false,
        change_to_downtrend_alert: false,
        chart_breach_downtrend_alert: false,
        chart_breach_uptrend_alert: false,
        delay_minutes: 0,
        alert_frequency: "once_per_bar",
      },
    });
  });

  it("normalizes old Volatility percentage configs without dropping legacy backend fields", () => {
    const normalized = normalizeIndicatorConfig({
      name: "volatility",
      timeframe: "single",
      config: {
        mode: "range_avg",
        length: 14,
        min_pct: 2,
        max_pct: 8,
        tolerance_pct: 0.1,
      },
    });

    expect(normalized.config).toMatchObject({
      mode: "range_avg",
      length: 14,
      min_pct: 2,
      max_pct: 8,
      tolerance_pct: 0.1,
      source: "close",
      atr_factor: 2,
      htf_selection: "Multiple Of Current TF",
      htf_multiple: 3,
      fixed_timeframe: "1D",
      rule: "threshold",
      window: 1,
    });
  });
});
