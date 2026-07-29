import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScreener } from "@/hooks/useScreener";

describe("tolerance safety", () => {
  it("keeps an explicit tolerance of 0 as numeric 0 in the built request, not null", () => {
    const { result } = renderHook(() => useScreener());

    act(() => {
      result.current.setIndicators([
        {
          name: "trend",
          timeframe: "single",
          config: {
            length: 8,
            areas: [
              {
                area: "top_line",
                action: "touched",
                window: 1,
                tolerance: 0,
                touch_type: "wick",
              },
            ],
          },
        },
      ]);
    });

    const request = result.current.buildRequest();
    const areas = request.indicators[0].config.areas as Array<{ tolerance: unknown }>;

    expect(areas[0].tolerance).toBe(0);
    expect(areas[0].tolerance).not.toBeNull();
  });
});
