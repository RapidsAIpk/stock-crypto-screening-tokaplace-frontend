import { describe, expect, it } from "vitest";

import {
  getAllowedConfluenceSelections,
  sanitizeConfluenceUiConfig,
  wouldDuplicateConfluenceSource,
} from "@/types/screener";

describe("confluence UI rules", () => {
  it("limits bullish selections to support lines and zones", () => {
    expect(getAllowedConfluenceSelections("bullish", "trend", 0)).toEqual([
      "bottom_line",
      "bottom_zone",
    ]);
    expect(getAllowedConfluenceSelections("bullish", "lrc", 1)).toEqual(["lower"]);
  });

  it("limits bearish selections to resistance lines and zones", () => {
    expect(getAllowedConfluenceSelections("bearish", "regression", 0)).toEqual(["upper"]);
    expect(getAllowedConfluenceSelections("bearish", "trend", 1)).toEqual([
      "top_line",
      "top_zone",
    ]);
  });

  it("keeps breakout source 1 on resistance and source 2 flexible", () => {
    expect(getAllowedConfluenceSelections("breakout", "trend", 0)).toEqual([
      "top_line",
      "top_zone",
    ]);
    expect(getAllowedConfluenceSelections("breakout", "lrc", 1)).toEqual(["upper", "lower"]);
  });

  it("sanitizes legacy any configs into a supported bullish setup", () => {
    const config = sanitizeConfluenceUiConfig({
      type: "any",
      channels: ["trend", "lrc"],
      sources: [
        { id: "trend_0", channel_type: "trend", selection: "top_line", length: 8 },
        { id: "lrc_1", channel_type: "lrc", selection: "upper", length: 100 },
      ],
      liquidity_sweep: false,
      lookback_candles: 4,
      tolerance_pct: 0.1,
    });

    expect(config.type).toBe("bullish");
    expect(config.sources?.[0].selection).toBe("bottom_line");
    expect(config.sources?.[1].selection).toBe("lower");
  });

  it("prevents identical source configs and bumps the second source", () => {
    const config = sanitizeConfluenceUiConfig({
      type: "bullish",
      channels: ["trend", "trend"],
      sources: [
        { id: "trend_0", channel_type: "trend", selection: "bottom_line", length: 8 },
        { id: "trend_1", channel_type: "trend", selection: "bottom_line", length: 8 },
      ],
      liquidity_sweep: false,
      lookback_candles: 4,
      tolerance_pct: 0.1,
    });

    expect(config.sources?.[0]).toMatchObject({
      channel_type: "trend",
      selection: "bottom_line",
      length: 8,
    });
    expect(config.sources?.[1]).toMatchObject({
      channel_type: "trend",
      selection: "bottom_zone",
      length: 9,
    });
  });

  it("detects duplicate source combinations", () => {
    const sources = [
      { id: "a", channel_type: "lrc" as const, selection: "lower" as const, length: 100 },
      { id: "b", channel_type: "lrc" as const, selection: "lower" as const, length: 150 },
    ];

    expect(wouldDuplicateConfluenceSource(sources, 1, { length: 100 })).toBe(true);
    expect(wouldDuplicateConfluenceSource(sources, 1, { length: 150, selection: "lower" })).toBe(false);
  });
});
