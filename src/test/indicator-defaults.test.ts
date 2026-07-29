import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScreener } from "@/hooks/useScreener";
import {
  getDefaultChannelLength,
  getDefaultIndicatorConfig,
  INDICATOR_DEFINITIONS,
  normalizeIndicatorConfig,
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
