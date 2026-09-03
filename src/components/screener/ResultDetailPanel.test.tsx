import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultDetailPanel } from "./ResultDetailPanel";
import type { ScreenerResult, ScreenerResultDetail } from "@/types/screener";

vi.mock("./ResultDetailChart", () => ({
  ResultDetailChart: () => <div data-testid="mock-result-detail-chart" />,
}));

vi.mock("@/hooks/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: { timezone: "UTC" },
  }),
}));

const baseResult: ScreenerResult = {
  symbol: "TEST",
  price: 10,
  asset_type: "stocks",
  data_source: "zoya",
  timeframe: "1h",
  stickers: [],
};

function buildDetail(indicatorDetail: ScreenerResultDetail["indicator_details"][number]): ScreenerResultDetail {
  return {
    ...baseResult,
    asset_metadata: {},
    request_filters: {},
    indicator_details: [indicatorDetail],
    filter_details: [],
    market_data: {
      recent_candles: [],
      last_candle: null,
    },
    channels: {},
    confluence_channels: {},
  };
}

describe("ResultDetailPanel Phase 2 channel evidence", () => {
  it("displays below_candles when backend provides it", () => {
    render(
      <ResultDetailPanel
        result={baseResult}
        detail={buildDetail({
          name: "trend",
          passed: true,
          config: {
            areas: [{
              area: "bottom_line",
              action: "reclaimed_from_below_bullish",
              below_candles_min: 1,
              below_candles_max: 5,
            }],
          },
          evidence: {
            channel_interactions: [{
              area: "bottom_line",
              action: "reclaimed_from_below_bullish",
              matched: true,
              candles_since: 2,
              below_candles: 4,
            }],
          },
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Below candles count")).toBeInTheDocument();
    expect(screen.getByText("Candles since reclaim")).toBeInTheDocument();
    expect(screen.getByText("Configured Below Candles Min")).toBeInTheDocument();
    expect(screen.getByText("Configured Below Candles Max")).toBeInTheDocument();
  });

  it("displays the below-candles-out-of-range message", () => {
    render(
      <ResultDetailPanel
        result={baseResult}
        detail={buildDetail({
          name: "regression",
          passed: false,
          config: {
            action: "reclaimed_from_below_bullish",
            below_candles_min: 1,
            below_candles_max: 3,
          },
          evidence: {
            channel_interactions: [{
              line: "lower",
              action: "reclaimed_from_below_bullish",
              matched: false,
              failure_reason: "below_candles_out_of_range",
              candles_since: 0,
              below_candles: 6,
            }],
          },
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Rejected because the latest reclaim was below the line for more candles than allowed.")).toBeInTheDocument();
  });

  it("displays a distinct piercing explanation", () => {
    render(
      <ResultDetailPanel
        result={baseResult}
        detail={buildDetail({
          name: "lrc",
          passed: true,
          config: {
            action: "piercing_from_below",
            candles_since_min: 0,
            candles_since_max: 5,
          },
          evidence: {
            channel_interactions: [{
              line: "lower",
              action: "piercing_from_below",
              matched: true,
              candles_since: 1,
            }],
          },
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Piercing From Below requires the candle to open below the line, trade through the line, and close above it.")).toBeInTheDocument();
    expect(screen.queryByText(/bounce/i)).not.toBeInTheDocument();
  });

  it("displays a distinct rejected-from-below explanation", () => {
    render(
      <ResultDetailPanel
        result={baseResult}
        detail={buildDetail({
          name: "lrc",
          passed: false,
          config: {
            action: "rejected_from_below_bearish",
            candles_since_min: 0,
            candles_since_max: 5,
          },
          evidence: {
            channel_interactions: [{
              line: "lower",
              action: "rejected_from_below_bearish",
              matched: false,
              failure_reason: "event_out_of_range",
              candles_since: null,
            }],
          },
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Rejected From Below requires price to approach from below, touch or pierce the line, and close back below it.")).toBeInTheDocument();
  });

  it("keeps existing generic channel detail rendering when Phase 2 evidence is absent", () => {
    render(
      <ResultDetailPanel
        result={baseResult}
        detail={buildDetail({
          name: "trend",
          passed: true,
          config: { action: "touched" },
          evidence: { summary: "Trend channel touched the selected area." },
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Trend channel touched the selected area.")).toBeInTheDocument();
  });
});
