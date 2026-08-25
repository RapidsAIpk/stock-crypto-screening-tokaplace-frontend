import {
  DEFAULT_EMA_CONDITIONS,
  EMA_COMMON_PERIODS,
  EMA_CONDITION_HELP,
  EMA_CONDITION_LABELS,
  EMA_SELECTION_MODES,
  normalizeEmaConfig,
} from "@/types/screener";
import type {
  EmaConditionConfig,
  EmaConditionName,
  EmaConfig,
  EmaSelectionMode,
} from "@/types/screener";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: EmaConfig) => void;
}

const EMA_CONDITION_ORDER: EmaConditionName[] = [
  "touch_from_above",
  "piercing_from_below",
  "close_above",
  "touched_or_pierced_and_closed_above",
];

const TRADINGVIEW_STANDARD_EMA_PERIODS = [20, 50, 100, 200];

function clampPeriod(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.trunc(numeric);
}

function clampCandlesSince(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.trunc(numeric);
}

function labelForMode(mode: EmaSelectionMode): string {
  return EMA_SELECTION_MODES.find((item) => item.value === mode)?.label ?? mode;
}

export function EmaFilterEditor({ config, onChange }: Props) {
  const [customPeriod, setCustomPeriod] = useState("");
  const normalized = useMemo(() => normalizeEmaConfig(config), [config]);

  const commit = (next: EmaConfig) => {
    onChange(normalizeEmaConfig(next as unknown as Record<string, unknown>));
  };

  const setPeriods = (periods: number[]) => {
    commit({
      ...normalized,
      periods: periods.length ? Array.from(new Set(periods)).sort((a, b) => a - b) : [9],
    });
  };

  const togglePeriod = (period: number) => {
    const selected = normalized.periods.includes(period);
    setPeriods(
      selected
        ? normalized.periods.filter((value) => value !== period)
        : [...normalized.periods, period],
    );
  };

  const addCustomPeriod = () => {
    const next = clampPeriod(customPeriod);
    if (next == null) {
      return;
    }
    setPeriods([...normalized.periods, next]);
    setCustomPeriod("");
  };

  const updateCondition = (name: EmaConditionName, patch: Partial<EmaConditionConfig>) => {
    const current = normalized.conditions[name] ?? DEFAULT_EMA_CONDITIONS[name];
    const next = {
      ...current,
      ...patch,
    };
    const min = clampCandlesSince(next.candles_since_min, current.candles_since_min);
    const max = Math.max(min, clampCandlesSince(next.candles_since_max, current.candles_since_max));

    commit({
      ...normalized,
      conditions: {
        ...normalized.conditions,
        [name]: {
          ...next,
          candles_since_min: min,
          candles_since_max: max,
        },
      },
    });
  };

  return (
    <div className="col-span-2 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">EMA Periods</div>
            <div className="text-[9px] text-muted-foreground/80">Choose one or more EMA lengths to evaluate.</div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {normalized.periods.join(", ")}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EMA_COMMON_PERIODS.map((period) => {
            const selected = normalized.periods.includes(period);
            return (
              <button
                key={period}
                type="button"
                onClick={() => togglePeriod(period)}
                className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-primary/60"
                }`}
              >
                {period}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPeriods(TRADINGVIEW_STANDARD_EMA_PERIODS)}
            className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            EMA 20/50/100/200
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={customPeriod}
            onChange={(event) => setCustomPeriod(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomPeriod();
              }
            }}
            placeholder="Custom"
            className="min-w-0 flex-1 rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground"
          />
          <button
            type="button"
            onClick={addCustomPeriod}
            title="Add custom EMA period"
            className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {normalized.periods.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {normalized.periods.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => togglePeriod(period)}
                title={`Remove EMA ${period}`}
                className="flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-foreground transition-colors hover:border-destructive/60"
              >
                EMA {period}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Period Match Mode</div>
        <div className="grid grid-cols-4 gap-1">
          {EMA_SELECTION_MODES.map((mode) => {
            const selected = normalized.selection_mode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => commit({ ...normalized, selection_mode: mode.value })}
                className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-primary/60"
                }`}
              >
                {labelForMode(mode.value)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">EMA Conditions</div>
        <div className="space-y-2">
          {EMA_CONDITION_ORDER.map((name) => {
            const condition = normalized.conditions[name];
            const active = condition.enabled;
            return (
              <div
                key={name}
                className={`space-y-2 rounded-md border p-2 transition-colors ${
                  active ? "border-primary/60 bg-primary/5" : "border-border/70"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => updateCondition(name, { enabled: event.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border border-border bg-secondary text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground">{EMA_CONDITION_LABELS[name]}</div>
                    <div className="text-[9px] text-muted-foreground/80">{EMA_CONDITION_HELP[name]}</div>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-2 pl-6 ${active ? "" : "opacity-45"}`}>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">Candles Since Min</div>
                    <input
                      type="number"
                      min={0}
                      value={condition.candles_since_min}
                      disabled={!active}
                      onChange={(event) => updateCondition(name, { candles_since_min: Number(event.target.value) })}
                      className="w-full rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">Candles Since Max</div>
                    <input
                      type="number"
                      min={condition.candles_since_min}
                      value={condition.candles_since_max}
                      disabled={!active}
                      onChange={(event) => updateCondition(name, { candles_since_max: Number(event.target.value) })}
                      className="w-full rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed"
                    />
                  </div>
                  {name === "touched_or_pierced_and_closed_above" && (
                    <label className="col-span-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={condition.require_still_above_now !== false}
                        disabled={!active}
                        onChange={(event) => updateCondition(name, { require_still_above_now: event.target.checked })}
                        className="h-4 w-4 rounded border border-border bg-secondary text-primary disabled:cursor-not-allowed"
                      />
                      Require latest completed close to still be above EMA
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
