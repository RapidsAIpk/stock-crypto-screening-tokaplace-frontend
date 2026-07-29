import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { IndicatorsFilter } from "@/components/screener/filters/IndicatorsFilter";
import type { IndicatorConfig } from "@/types/screener";

function volumeIndicator(config: Partial<IndicatorConfig["config"]> = {}): IndicatorConfig[] {
  return [
    {
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
        ...config,
      },
    },
  ];
}

describe("Volume Spike TradingView parity helper", () => {
  it("shows TradingView-native Volume Spikes [TFO] fields", () => {
    render(
      <IndicatorsFilter
        indicators={volumeIndicator({ vol_ma: 100, vol_x: 1.5 })}
        onChange={vi.fn()}
        timeframeMode="single"
      />,
    );

    expect(screen.getByText("Volume Multiplier")).toBeInTheDocument();
    expect(screen.getByText("Volume SMA Length")).toBeInTheDocument();
    expect(screen.getByText("Only Use Valid Highs & Lows")).toBeInTheDocument();
    expect(screen.getByText("Only Use Hammers & Shooters")).toBeInTheDocument();
    expect(screen.getByText("Only Use Same-Close Volume Spikes")).toBeInTheDocument();
    expect(screen.getByText("Session Time")).toBeInTheDocument();
    expect(screen.queryByText("Advanced Screening")).not.toBeInTheDocument();
  });

  it("does not show old legacy Volume Spike labels", () => {
    render(
      <IndicatorsFilter
        indicators={volumeIndicator()}
        onChange={vi.fn()}
        timeframeMode="single"
      />,
    );

    expect(screen.queryByText("Average Length")).not.toBeInTheDocument();
    expect(screen.queryByText("Spike Strength")).not.toBeInTheDocument();
    expect(screen.queryByText("Signal Window")).not.toBeInTheDocument();
    expect(screen.queryByText("Tolerance %")).not.toBeInTheDocument();
    expect(screen.queryByText(/For TradingView comparison/)).not.toBeInTheDocument();
  });

  it("keeps the underlying config shape unchanged", () => {
    const indicators = volumeIndicator({ vol_ma: 100, vol_x: 2, session: "0930-1600" });

    render(<IndicatorsFilter indicators={indicators} onChange={vi.fn()} timeframeMode="single" />);

    expect(indicators[0].config).toMatchObject({ vol_ma: 100, vol_x: 2, session: "0930-1600" });
  });
});
