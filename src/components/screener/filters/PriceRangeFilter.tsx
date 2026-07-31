import { useEffect, useMemo, useState } from "react";
import type { PriceRange } from "@/types/screener";
import { FieldLabel, FilterToggle } from "./FilterUi";

interface Props {
  value: PriceRange | null;
  onChange: (value: PriceRange | null) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground";

export function PriceRangeFilter({ value, onChange }: Props) {
  const enabled = value !== null;
  const [minInput, setMinInput] = useState(
    value?.min_price !== undefined && value?.min_price !== null ? String(value.min_price) : "",
  );
  const [maxInput, setMaxInput] = useState(
    value?.max_price !== undefined && value?.max_price !== null ? String(value.max_price) : "",
  );

  useEffect(() => {
    setMinInput(value?.min_price !== undefined && value?.min_price !== null ? String(value.min_price) : "");
    setMaxInput(value?.max_price !== undefined && value?.max_price !== null ? String(value.max_price) : "");
  }, [value?.max_price, value?.min_price]);

  const helper = useMemo(() => {
    if (!enabled) return "Leave blank for any price. Set min, max, or both to narrow results.";
    const min = minInput.trim();
    const max = maxInput.trim();
    if (!min && !max) return "Any price — leave both fields blank.";
    if (min && max) return `Active range: ${min} – ${max}`;
    if (min) return `Minimum price: ${min}`;
    return `Maximum price: ${max}`;
  }, [enabled, maxInput, minInput]);

  const apply = (nextMin: string, nextMax: string) => {
    const minPrice = nextMin.trim() === "" ? null : Number(nextMin);
    const maxPrice = nextMax.trim() === "" ? null : Number(nextMax);

    if (!enabled) {
      return;
    }

    onChange({
      min_price: Number.isFinite(minPrice as number) ? (minPrice as number) : null,
      max_price: Number.isFinite(maxPrice as number) ? (maxPrice as number) : null,
    });
  };

  return (
    <div className="space-y-2">
      <FilterToggle
        enabled={enabled}
        onToggle={() => {
          if (enabled) {
            onChange(null);
            return;
          }
          onChange({ min_price: null, max_price: null });
        }}
        label="Average Price Range"
        info={helper}
      />
      {enabled && (
        <div className="grid grid-cols-2 gap-3 pl-7">
          <div className="space-y-1.5">
            <FieldLabel>Min</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minInput}
              onChange={(e) => {
                const next = e.target.value;
                setMinInput(next);
                apply(next, maxInput);
              }}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Max</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxInput}
              onChange={(e) => {
                const next = e.target.value;
                setMaxInput(next);
                apply(minInput, next);
              }}
              className={inputClass}
              placeholder="No cap"
            />
          </div>
        </div>
      )}
    </div>
  );
}
