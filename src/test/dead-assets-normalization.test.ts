import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScreener } from "@/hooks/useScreener";
import type { FilterSnapshot } from "@/hooks/useUserSettings";
import {
  ALL_DEAD_TREND_TYPES,
  DEFAULT_DEAD_ASSETS_FILTER,
  normalizeDeadAssetsFilter,
} from "@/types/screener";

describe("normalizeDeadAssetsFilter", () => {
  it("keeps all four types when all four are selected", () => {
    const result = normalizeDeadAssetsFilter({
      ...DEFAULT_DEAD_ASSETS_FILTER,
      dead_trend_types: ["strong_dead_trend", "slow_bleeding_trend", "failed_recovery", "flat_dead_asset"],
    });

    expect(result?.dead_trend_types).toEqual([
      "strong_dead_trend",
      "slow_bleeding_trend",
      "failed_recovery",
      "flat_dead_asset",
    ]);
  });

  it("keeps only the two types actually selected, without hardcoding the rest", () => {
    const result = normalizeDeadAssetsFilter({
      ...DEFAULT_DEAD_ASSETS_FILTER,
      dead_trend_types: ["failed_recovery", "strong_dead_trend"],
    });

    expect(result?.dead_trend_types).toEqual(["strong_dead_trend", "failed_recovery"]);
  });

  it("does not mutate the array passed in", () => {
    const original: typeof ALL_DEAD_TREND_TYPES = ["strong_dead_trend", "failed_recovery"];
    const filter = { ...DEFAULT_DEAD_ASSETS_FILTER, dead_trend_types: original };

    normalizeDeadAssetsFilter(filter);

    expect(original).toEqual(["strong_dead_trend", "failed_recovery"]);
    expect(filter.dead_trend_types).toBe(original);
  });

  it("preserves a null (disabled) filter as null", () => {
    expect(normalizeDeadAssetsFilter(null)).toBeNull();
  });
});

function baseSnapshot(overrides: Partial<FilterSnapshot>): FilterSnapshot {
  return {
    assetType: "crypto",
    complianceStatus: null,
    complianceStandards: [],
    assetCategories: [],
    sectors: [],
    excludedCategories: [],
    cryptoExchanges: [],
    timeframeMode: "single",
    singleTimeframe: "1day",
    gateTimeframe: "4h",
    entryTimeframe: "1h",
    indicators: [],
    channelRespect: null,
    confluence: null,
    priceRange: null,
    deadAssets: DEFAULT_DEAD_ASSETS_FILTER,
    ...overrides,
  };
}

describe("Dead Assets filter through useScreener", () => {
  it("changing an unrelated Dead Assets setting does not remove selected types", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setDeadAssets({
        ...DEFAULT_DEAD_ASSETS_FILTER,
        dead_trend_types: ["strong_dead_trend", "flat_dead_asset"],
      });
    });
    act(() => {
      result.current.setDeadAssets({
        ...(result.current.deadAssets as typeof DEFAULT_DEAD_ASSETS_FILTER),
        lower_highs_required: 4,
      });
    });

    expect(result.current.deadAssets?.dead_trend_types).toEqual(["strong_dead_trend", "flat_dead_asset"]);
    expect(result.current.deadAssets?.lower_highs_required).toBe(4);

    const request = result.current.buildRequest();
    expect(request.dead_assets?.dead_trend_types).toEqual(["strong_dead_trend", "flat_dead_asset"]);
  });

  it("loading a preset preserves all selected Dead Asset types", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.loadSnapshot(
        baseSnapshot({
          deadAssets: {
            ...DEFAULT_DEAD_ASSETS_FILTER,
            dead_trend_types: ["slow_bleeding_trend", "failed_recovery", "flat_dead_asset"],
          },
        }),
      );
    });

    expect(result.current.deadAssets?.dead_trend_types).toEqual([
      "slow_bleeding_trend",
      "failed_recovery",
      "flat_dead_asset",
    ]);
  });

  it("sends exactly the four selected types in the request when all four are selected", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setDeadAssets({ ...DEFAULT_DEAD_ASSETS_FILTER });
    });

    const request = result.current.buildRequest();
    expect(request.dead_assets?.dead_trend_types).toEqual([
      "strong_dead_trend",
      "slow_bleeding_trend",
      "failed_recovery",
      "flat_dead_asset",
    ]);
  });
});
