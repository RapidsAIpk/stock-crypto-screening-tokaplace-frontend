import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IndicatorsFilter } from "@/components/screener/filters/IndicatorsFilter";
import { DEFAULT_EMA_CONFIG } from "@/types/screener";
import type { IndicatorConfig } from "@/types/screener";

function emaIndicator(config: Partial<IndicatorConfig["config"]> = {}): IndicatorConfig[] {
  return [
    {
      name: "ema",
      timeframe: "single",
      config: {
        ...DEFAULT_EMA_CONFIG,
        ...config,
      },
    },
  ];
}

describe("EMA filter editor", () => {
  it("sets TradingView EMA 20/50/100/200 periods without changing mode or conditions", () => {
    const onChange = vi.fn();

    render(
      <IndicatorsFilter
        indicators={emaIndicator({
          periods: [9],
          selection_mode: "all",
          conditions: {
            ...DEFAULT_EMA_CONFIG.conditions,
            close_above: {
              enabled: false,
              candles_since_min: 0,
              candles_since_max: 0,
            },
            piercing_from_below: {
              enabled: true,
              candles_since_min: 1,
              candles_since_max: 4,
            },
          },
        })}
        onChange={onChange}
        timeframeMode="single"
      />,
    );

    fireEvent.click(screen.getByText("EMA 20/50/100/200"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].config).toEqual({
      periods: [20, 50, 100, 200],
      selection_mode: "all",
      conditions: {
        ...DEFAULT_EMA_CONFIG.conditions,
        close_above: {
          enabled: false,
          candles_since_min: 0,
          candles_since_max: 0,
        },
        piercing_from_below: {
          enabled: true,
          candles_since_min: 1,
          candles_since_max: 4,
        },
      },
    });
  });
});

