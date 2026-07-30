import { describe, expect, it } from "vitest";
import { buildTrendLineData } from "./trendChannelChartStyles";
import { normalizeTrendChannel } from "./resultDetailChartData";

describe("trendChannelChartStyles", () => {
  it("builds line data aligned to the trailing channel window", () => {
    const channel = normalizeTrendChannel({
      trend: {
        length: 2,
        direction: "down",
        top: [12, 11],
        top_zone_lower: [11.5, 10.5],
        middle: [10, 9],
        bottom_zone_upper: [8.5, 7.5],
        bottom: [8, 7],
      },
    });

    const source = [
      { time: 1, open: 10, high: 12, low: 9, close: 10 },
      { time: 2, open: 10, high: 11, low: 8, close: 9 },
      { time: 3, open: 9, high: 10, low: 7, close: 8 },
    ];

    expect(channel).not.toBeNull();
    expect(buildTrendLineData(source, channel!, "top")).toEqual([
      { time: 2, value: 12 },
      { time: 3, value: 11 },
    ]);
  });
});
