import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IndicatorsFilter } from "@/components/screener/filters/IndicatorsFilter";
import { useScreener } from "@/hooks/useScreener";
import type { IndicatorConfig } from "@/types/screener";

function ControlledIndicators({ initial }: { initial: IndicatorConfig[] }) {
  const [indicators, setIndicators] = useState(initial);
  return (
    <IndicatorsFilter
      indicators={indicators}
      onChange={setIndicators}
      timeframeMode="single"
    />
  );
}

function reclaimedConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lines: ["lower"],
    action: "reclaimed_from_below_bullish",
    selection_mode: "any",
    candles_since_min: 0,
    candles_since_max: 5,
    below_candles_min: 1,
    below_candles_max: 5,
    min_consecutive_below: 1,
    require_still_above_now: true,
    window: 1,
    ...overrides,
  };
}

function channelIndicator(name: "lrc" | "regression", config: Record<string, unknown>): IndicatorConfig {
  return {
    name,
    timeframe: "single",
    config,
  };
}

function trendIndicator(areaConfig: Record<string, unknown>): IndicatorConfig {
  return {
    name: "trend",
    timeframe: "single",
    config: {
      selection_mode: "any",
      areas: [
        {
          area: "bottom_line",
          action: "reclaimed_from_below_bullish",
          candles_since_min: 0,
          candles_since_max: 5,
          below_candles_min: 1,
          below_candles_max: 5,
          min_consecutive_below: 1,
          require_still_above_now: true,
          window: 1,
          ...areaConfig,
        },
      ],
    },
  };
}

function numberInput(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

function expectCanClearAndType(label: string) {
  const input = numberInput(label);
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  fireEvent.change(input, { target: { value: "4" } });
  expect(input.value).toBe("4");
}

describe("Phase 2 channel UI", () => {
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

  it("LRC reclaimed action shows and sends reclaim and below candle min/max fields", async () => {
    render(<ControlledIndicators initial={[channelIndicator("lrc", reclaimedConfig())]} />);

    expect(screen.getByText("Candles Since Reclaim Min")).toBeInTheDocument();
    expect(screen.getByText("Candles Since Reclaim Max")).toBeInTheDocument();
    expect(screen.getByText("Below Candles Min")).toBeInTheDocument();
    expect(screen.getByText("Below Candles Max")).toBeInTheDocument();
    expect(screen.getByText("Minimum Consecutive Below")).toBeInTheDocument();
    expect(screen.getByText("Require Still Above Now")).toBeInTheDocument();

    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([channelIndicator("lrc", reclaimedConfig())]);
    });

    expect(result.current.buildRequest().indicators[0].config).toMatchObject({
      lines: ["lower"],
      action: "reclaimed_from_below_bullish",
      selection_mode: "any",
      candles_since_min: 0,
      candles_since_max: 5,
      below_candles_min: 1,
      below_candles_max: 5,
      min_consecutive_below: 1,
      require_still_above_now: true,
      window: 1,
    });
  });

  it("Regression reclaimed action shows and sends reclaim and below candle min/max fields", async () => {
    render(<ControlledIndicators initial={[channelIndicator("regression", reclaimedConfig())]} />);

    expect(screen.getByText("Candles Since Reclaim Min")).toBeInTheDocument();
    expect(screen.getByText("Candles Since Reclaim Max")).toBeInTheDocument();
    expect(screen.getByText("Below Candles Min")).toBeInTheDocument();
    expect(screen.getByText("Below Candles Max")).toBeInTheDocument();

    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([channelIndicator("regression", reclaimedConfig())]);
    });

    expect(result.current.buildRequest().indicators[0].config).toMatchObject({
      action: "reclaimed_from_below_bullish",
      candles_since_min: 0,
      candles_since_max: 5,
      below_candles_min: 1,
      below_candles_max: 5,
      min_consecutive_below: 1,
      require_still_above_now: true,
      window: 1,
    });
  });

  it("Trend Channel area reclaimed action shows and sends reclaim and below candle min/max fields", async () => {
    render(<ControlledIndicators initial={[trendIndicator({})]} />);

    expect(screen.getByLabelText("Area Rule 1 Candles Since Reclaim Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Candles Since Reclaim Max")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Below Candles Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Below Candles Max")).toBeInTheDocument();

    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([trendIndicator({})]);
    });

    expect(result.current.buildRequest().indicators[0].config).toMatchObject({
      selection_mode: "any",
      areas: [
        {
          area: "bottom_line",
          action: "reclaimed_from_below_bullish",
          candles_since_min: 0,
          candles_since_max: 5,
          below_candles_min: 1,
          below_candles_max: 5,
          min_consecutive_below: 1,
          require_still_above_now: true,
          window: 1,
        },
      ],
    });
  });

  it("other Phase 2 channel actions still show candles since min/max fields", () => {
    render(
      <ControlledIndicators
        initial={[
          channelIndicator("lrc", {
            lines: ["lower"],
            action: "piercing_from_below",
            selection_mode: "all",
            candles_since_min: 0,
            candles_since_max: 5,
            below_candles_min: 1,
            below_candles_max: 5,
            min_consecutive_below: 1,
            require_still_above_now: true,
            window: 1,
          }),
        ]}
      />,
    );

    expect(screen.getByLabelText("Linear Regression Channel Candles Since Event Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Linear Regression Channel Candles Since Event Max")).toBeInTheDocument();
    expect(screen.queryByText("Below Candles Min")).not.toBeInTheDocument();
  });

  it("does not send reclaim-only fields for non-reclaim LRC Phase 2 actions", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        channelIndicator("lrc", {
          lines: ["lower"],
          action: "rejected_from_below_bearish",
          selection_mode: "all",
          candles_since_min: 0,
          candles_since_max: 5,
          below_candles_min: 1,
          below_candles_max: 5,
          min_consecutive_below: 1,
          require_still_above_now: true,
          window: 1,
        }),
      ]);
    });

    const config = result.current.buildRequest().indicators[0].config;
    expect(config).toMatchObject({
      action: "rejected_from_below_bearish",
      candles_since_min: 0,
      candles_since_max: 5,
      window: 1,
    });
    expect(config).not.toHaveProperty("below_candles_min");
    expect(config).not.toHaveProperty("below_candles_max");
    expect(config).not.toHaveProperty("min_consecutive_below");
    expect(config).not.toHaveProperty("require_still_above_now");
  });

  it("does not send reclaim-only fields for non-reclaim Trend Channel area actions", async () => {
    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        trendIndicator({
          area: "bottom_line",
          action: "piercing_from_below",
          candles_since_min: 0,
          candles_since_max: 5,
          below_candles_min: 1,
          below_candles_max: 5,
          min_consecutive_below: 1,
          require_still_above_now: true,
          window: 1,
        }),
      ]);
    });

    const area = (result.current.buildRequest().indicators[0].config.areas as Record<string, unknown>[])[0];
    expect(area).toMatchObject({
      area: "bottom_line",
      action: "piercing_from_below",
      candles_since_min: 0,
      candles_since_max: 5,
      window: 1,
    });
    expect(area).not.toHaveProperty("below_candles_min");
    expect(area).not.toHaveProperty("below_candles_max");
    expect(area).not.toHaveProperty("min_consecutive_below");
    expect(area).not.toHaveProperty("require_still_above_now");
  });

  it("old channel actions still show and send window", async () => {
    render(
      <ControlledIndicators
        initial={[
          channelIndicator("lrc", {
            lines: ["middle"],
            action: "touched",
            selection_mode: "all",
            window: 3,
          }),
        ]}
      />,
    );

    expect(screen.getByText("How Many Candles")).toBeInTheDocument();
    expect(screen.queryByLabelText("Linear Regression Channel Candles Since Event Min")).not.toBeInTheDocument();

    const { result } = renderHook(() => useScreener());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setIndicators([
        channelIndicator("lrc", {
          lines: ["middle"],
          action: "touched",
          selection_mode: "all",
          window: 3,
        }),
      ]);
    });

    expect(result.current.buildRequest().indicators[0].config).toMatchObject({
      action: "touched",
      window: 3,
    });
    expect(result.current.buildRequest().indicators[0].config).not.toHaveProperty("candles_since_min");
  });

  it("Phase 2 numeric fields can be cleared and typed normally", () => {
    render(<ControlledIndicators initial={[channelIndicator("lrc", reclaimedConfig())]} />);

    expectCanClearAndType("Linear Regression Channel Candles Since Reclaim Min");
    expectCanClearAndType("Linear Regression Channel Candles Since Reclaim Max");
    expectCanClearAndType("Linear Regression Channel Below Candles Min");
    expectCanClearAndType("Linear Regression Channel Below Candles Max");
    expectCanClearAndType("Linear Regression Channel Minimum Consecutive Below");
  });

  it("dynamically shows reclaim timing fields when LRC action is changed to reclaimed from below", () => {
    render(
      <ControlledIndicators
        initial={[
          channelIndicator("lrc", {
            lines: ["middle"],
            action: "touch",
            selection_mode: "all",
            window: 1,
          }),
        ]}
      />,
    );

    expect(screen.queryByLabelText("Linear Regression Channel Candles Since Reclaim Min")).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("touch"), {
      target: { value: "reclaimed_from_below_bullish" },
    });

    expect(screen.getByText("reclaimed from below + closed above")).toBeInTheDocument();
    expect(screen.getByLabelText("Linear Regression Channel Candles Since Reclaim Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Linear Regression Channel Candles Since Reclaim Max")).toBeInTheDocument();
    expect(screen.getByLabelText("Linear Regression Channel Below Candles Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Linear Regression Channel Below Candles Max")).toBeInTheDocument();
  });

  it("dynamically shows reclaim timing fields when Trend Channel area action is changed", () => {
    render(
      <ControlledIndicators
        initial={[
          trendIndicator({
            action: "touched",
            candles_since_min: undefined,
            candles_since_max: undefined,
            below_candles_min: undefined,
            below_candles_max: undefined,
          }),
        ]}
      />,
    );

    expect(screen.queryByLabelText("Area Rule 1 Candles Since Reclaim Min")).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("touched"), {
      target: { value: "reclaimed_from_below_bullish" },
    });

    expect(screen.getByText("reclaimed from below + closed above")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Candles Since Reclaim Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Candles Since Reclaim Max")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Below Candles Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Area Rule 1 Below Candles Max")).toBeInTheDocument();
  });

  it("shows reclaimed min/max controls for every Trend Channel area", () => {
    const areas = ["bottom_line", "top_line", "middle_line", "bottom_zone", "top_zone", "middle_zone"];
    render(
      <ControlledIndicators
        initial={[
          {
            name: "trend",
            timeframe: "single",
            config: {
              selection_mode: "any",
              areas: areas.map((area) => ({
                area,
                action: "reclaimed_from_below_bullish",
                candles_since_min: 0,
                candles_since_max: 5,
                below_candles_min: 1,
                below_candles_max: 5,
                min_consecutive_below: 1,
                require_still_above_now: true,
                window: 1,
              })),
            },
          },
        ]}
      />,
    );

    areas.forEach((_, index) => {
      const rule = index + 1;
      expect(screen.getByLabelText(`Area Rule ${rule} Candles Since Reclaim Min`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Area Rule ${rule} Candles Since Reclaim Max`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Area Rule ${rule} Below Candles Min`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Area Rule ${rule} Below Candles Max`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Area Rule ${rule} Minimum Consecutive Below`)).toBeInTheDocument();
    });
  });
});
