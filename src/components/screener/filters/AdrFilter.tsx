import { useEffect, useState } from "react";
import type { AdrCondition, AdrFilter as AdrFilterConfig } from "@/types/screener";
import { ADR_CONDITION_LABELS, DEFAULT_ADR_FILTER, adrFilterError } from "@/types/screener";
import { FieldLabel, FilterToggle } from "./FilterUi";

interface Props {
  value: AdrFilterConfig | null;
  onChange: (value: AdrFilterConfig | null) => void;
  assetType: string;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground disabled:opacity-50";

const CONDITIONS: AdrCondition[] = ["gte", "lte", "between"];

function toText(value: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

export function AdrFilter({ value, onChange, assetType }: Props) {
  const enabled = value !== null;

  // Raw text is tracked separately from the numeric config so a field can be
  // cleared and retyped without snapping back to a floor mid-keystroke.
  const [lookbackInput, setLookbackInput] = useState(toText(value?.lookback_days ?? null));
  const [minInput, setMinInput] = useState(toText(value?.min_adr ?? null));
  const [maxInput, setMaxInput] = useState(toText(value?.max_adr ?? null));

  useEffect(() => {
    setLookbackInput(toText(value?.lookback_days ?? null));
  }, [value?.lookback_days]);

  useEffect(() => {
    setMinInput(toText(value?.min_adr ?? null));
  }, [value?.min_adr]);

  useEffect(() => {
    setMaxInput(toText(value?.max_adr ?? null));
  }, [value?.max_adr]);

  const error = adrFilterError(value);
  const condition = value?.condition ?? "gte";
  const minDisabled = condition === "lte";
  const maxDisabled = condition === "gte";

  const patch = (changes: Partial<AdrFilterConfig>) => {
    if (!value) return;
    onChange({ ...value, ...changes });
  };

  const commitNumber = (raw: string, key: "min_adr" | "max_adr") => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      patch({ [key]: null } as Partial<AdrFilterConfig>);
      return;
    }
    const parsed = Number(trimmed);
    patch({ [key]: Number.isFinite(parsed) ? parsed : null } as Partial<AdrFilterConfig>);
  };

  const commitLookback = (raw: string) => {
    const parsed = Math.trunc(Number(raw.trim()));
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_ADR_FILTER.lookback_days;
    setLookbackInput(String(next));
    patch({ lookback_days: next });
  };

  return (
    <div className="space-y-2">
      <FilterToggle
        enabled={enabled}
        onToggle={() => onChange(enabled ? null : { ...DEFAULT_ADR_FILTER })}
        label="Average Daily Range ($)"
        info="Average of (Daily High − Daily Low) over the chosen number of completed daily candles. Always read from 1-Day candles, whatever timeframe the scan runs on. Not ATR, not True Range, not a percentage."
      />

      {enabled && value && (
        <div className="space-y-3 pl-7">
          <div className="space-y-1.5">
            <FieldLabel info="Whole number of completed daily candles to average. Symbols with less daily history than this are excluded rather than averaged over a shorter window.">
              Lookback Days
            </FieldLabel>
            <input
              type="number"
              min="1"
              step="1"
              value={lookbackInput}
              onChange={(e) => setLookbackInput(e.target.value)}
              onBlur={(e) => commitLookback(e.target.value)}
              className={inputClass}
              placeholder="14"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Condition</FieldLabel>
            <select
              value={condition}
              onChange={(e) => patch({ condition: e.target.value as AdrCondition })}
              className={inputClass}
            >
              {CONDITIONS.map((option) => (
                <option key={option} value={option}>
                  {ADR_CONDITION_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Minimum ADR $</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={minDisabled}
                value={minDisabled ? "" : minInput}
                onChange={(e) => setMinInput(e.target.value)}
                onBlur={(e) => commitNumber(e.target.value, "min_adr")}
                className={inputClass}
                placeholder="0.60"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Maximum ADR $</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={maxDisabled}
                value={maxDisabled ? "" : maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                onBlur={(e) => commitNumber(e.target.value, "max_adr")}
                className={inputClass}
                placeholder={condition === "between" ? "1.00" : "Optional"}
              />
            </div>
          </div>

          {assetType === "crypto" && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={value.apply_to_crypto}
                onChange={(e) => patch({ apply_to_crypto: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                Apply to crypto as well. Off by default so 24/7 crypto daily candles aren&apos;t
                mixed with stock-market daily sessions.
              </span>
            </label>
          )}

          {error && <div className="text-[11px] text-destructive">{error}</div>}
        </div>
      )}
    </div>
  );
}
