import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScreener } from "@/hooks/useScreener";
import type { FilterSnapshot } from "@/hooks/useUserSettings";
import { DEFAULT_DEAD_ASSETS_FILTER } from "@/types/screener";

// Routes by URL substring (rather than call order) because useScreener also
// fires its own background fetches (crypto-exchanges, stock-filter-options)
// that would otherwise consume a plain response queue out of order.
function mockFetchByEndpoint(routes: Record<string, Record<string, unknown>>) {
  const calls: Array<{ url: string; body: Record<string, unknown> | null }> = [];

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, body });
    const routeKey = Object.keys(routes).find((key) => url.includes(key));
    const response = routeKey ? routes[routeKey] : {};
    return {
      ok: true,
      json: async () => response,
    } as Response;
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

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

describe("gate-entry indicator scope migration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts a 'single' indicator to 'secondary' when switching single -> gate_entry", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setIndicators([{ name: "trend", timeframe: "single", config: {} }]);
    });
    act(() => {
      result.current.setTimeframeMode("gate_entry");
    });

    expect(result.current.indicators).toHaveLength(1);
    expect(result.current.indicators[0].timeframe).toBe("secondary");
  });

  it("converts every indicator scope to 'single' when switching gate_entry -> single", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setTimeframeMode("gate_entry");
    });
    act(() => {
      result.current.setIndicators([
        { name: "rsi", timeframe: "primary", config: {} },
        { name: "trend", timeframe: "secondary", config: {} },
      ]);
    });
    act(() => {
      result.current.setTimeframeMode("single");
    });

    expect(result.current.indicators.every((i) => i.timeframe === "single")).toBe(true);
  });

  it("migrates an old gate-entry preset with timeframe 'single' to 'secondary' on load", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.loadSnapshot(
        baseSnapshot({
          timeframeMode: "gate_entry",
          indicators: [{ name: "trend", timeframe: "single", config: {} }],
        }),
      );
    });

    expect(result.current.indicators[0].timeframe).toBe("secondary");
  });

  it("gate request contains only primary indicators", async () => {
    const { calls } = mockFetchByEndpoint({
      "run-gate": { results: [{ symbol: "BTC-USD" }], gate_session_id: "sess-1" },
    });

    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setTimeframeMode("gate_entry");
    });
    act(() => {
      result.current.setIndicators([
        { name: "rsi", timeframe: "primary", config: {} },
        { name: "trend", timeframe: "secondary", config: {} },
      ]);
    });

    await act(async () => {
      await result.current.runGate();
    });

    await waitFor(() => expect(calls.some((c) => c.url.includes("run-gate"))).toBe(true));
    const gateCall = calls.find((c) => c.url.includes("run-gate"));
    const sentIndicators = (gateCall?.body.indicators as Array<{ name: string; timeframe: string }>) ?? [];
    expect(sentIndicators.map((i) => ({ name: i.name, timeframe: i.timeframe }))).toEqual([
      { name: "rsi", timeframe: "primary" },
    ]);
  });

  it("entry request contains only secondary indicators", async () => {
    const { calls } = mockFetchByEndpoint({
      "run-gate": { results: [{ symbol: "BTC-USD" }], gate_session_id: "sess-1" },
      "run-entry": { results: [{ symbol: "BTC-USD" }] },
    });

    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setTimeframeMode("gate_entry");
    });
    act(() => {
      result.current.setIndicators([
        { name: "rsi", timeframe: "primary", config: {} },
        { name: "trend", timeframe: "secondary", config: {} },
      ]);
    });

    await act(async () => {
      await result.current.runGate();
    });
    await act(async () => {
      await result.current.runEntry();
    });

    await waitFor(() => expect(calls.some((c) => c.url.includes("run-entry"))).toBe(true));
    const entryCall = calls.find((c) => c.url.includes("run-entry"));
    const sentIndicators = (entryCall?.body.indicators as Array<{ name: string; timeframe: string }>) ?? [];
    expect(sentIndicators.map((i) => ({ name: i.name, timeframe: i.timeframe }))).toEqual([
      { name: "trend", timeframe: "secondary" },
    ]);
  });

  it("keeps Trend Channel in the 1h entry request for the confirmed gate=4h/entry=1h case", async () => {
    const { calls } = mockFetchByEndpoint({
      "run-gate": { results: [{ symbol: "BTC-USD" }], gate_session_id: "sess-1" },
      "run-entry": { results: [] },
    });

    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setGateTimeframe("4h");
    });
    act(() => {
      result.current.setEntryTimeframe("1h");
    });
    act(() => {
      result.current.setIndicators([{ name: "trend", timeframe: "single", config: { length: 8 } }]);
    });
    act(() => {
      result.current.setTimeframeMode("gate_entry");
    });

    await act(async () => {
      await result.current.runGate();
    });
    await act(async () => {
      await result.current.runEntry();
    });

    await waitFor(() => expect(calls.some((c) => c.url.includes("run-entry"))).toBe(true));
    const entryCall = calls.find((c) => c.url.includes("run-entry"));
    expect(entryCall?.body.entry_timeframe).toBe("1h");
    const sentIndicators =
      (entryCall?.body.indicators as Array<{ name: string; timeframe: string; config: { length: number } }>) ?? [];
    expect(sentIndicators).toHaveLength(1);
    expect(sentIndicators[0].name).toBe("trend");
    expect(sentIndicators[0].timeframe).toBe("secondary");
    expect(sentIndicators[0].config.length).toBe(8);
  });

  it("does not silently remove an indicator that is still invalidly scoped to 'single'", async () => {
    const { calls } = mockFetchByEndpoint({
      "run-gate": { results: [], gate_session_id: "sess-1" },
    });

    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setTimeframeMode("gate_entry");
    });
    // Bypass the mode-aware migration to simulate a residual invalid scope
    // (e.g. a future caller that doesn't respect timeframeMode).
    act(() => {
      result.current.setIndicators([{ name: "trend", timeframe: "single", config: {} }]);
    });

    await act(async () => {
      await result.current.runGate();
    });

    expect(calls.some((c) => c.url.includes("run-gate"))).toBe(false);
    expect(result.current.errorMessage).toMatch(/timeframe scope/i);
    expect(result.current.errorMessage).toMatch(/trend/i);
  });
});
