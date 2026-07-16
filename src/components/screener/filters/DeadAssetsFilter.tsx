import type {
  DeadAssetsFilter as DeadAssetsFilterConfig,
  DeadTrendType,
} from "@/types/screener";
import { DEFAULT_DEAD_ASSETS_FILTER } from "@/types/screener";
import { CheckboxGroup } from "./CheckboxGroup";
import { PresetOrCustomField } from "./PresetOrCustomField";

interface Props {
  value: DeadAssetsFilterConfig | null;
  onChange: (value: DeadAssetsFilterConfig | null) => void;
}

const DEAD_TREND_TYPE_OPTIONS: { label: string; value: DeadTrendType }[] = [
  { label: "Strong Dead Trend", value: "strong_dead_trend" },
  { label: "Slow Bleeding Trend", value: "slow_bleeding_trend" },
  { label: "Failed Recovery", value: "failed_recovery" },
  { label: "Flat Dead Asset", value: "flat_dead_asset" },
];

const TREND_SOURCE_OPTIONS: { label: string; value: DeadAssetsFilterConfig["trend_source"] }[] = [
  { label: "EMA 50", value: "ema_50" },
  { label: "EMA 100", value: "ema_100" },
  { label: "EMA 200", value: "ema_200" },
  { label: "Linear Regression", value: "linear_regression" },
];

const VOLUME_OPTIONS: { label: string; value: DeadAssetsFilterConfig["volume_option"] }[] = [
  { label: "Low Volume", value: "low" },
  { label: "Declining Volume", value: "declining" },
  { label: "Either", value: "either" },
];

const VOLATILITY_OPTIONS: { label: string; value: DeadAssetsFilterConfig["volatility_option"] }[] = [
  { label: "Low ATR", value: "low_atr" },
  { label: "Very Low ATR", value: "very_low_atr" },
  { label: "Either", value: "either" },
];

const RECOVERY_OVERRIDE_OPTIONS: { label: string; value: DeadAssetsFilterConfig["recovery_override"] }[] = [
  { label: "Disabled", value: "disabled" },
  { label: "Wick Above Previous Swing High", value: "wick_above_swing_high" },
  { label: "Candle Close Above Previous Swing High", value: "close_above_swing_high" },
  { label: "Two Consecutive Closes Above Previous Swing High", value: "two_closes_above_swing_high" },
];

export function DeadAssetsFilter({ value, onChange }: Props) {
  const enabled = value !== null;

  const toggle = () => {
    onChange(enabled ? null : { ...DEFAULT_DEAD_ASSETS_FILTER });
  };

  const update = (patch: Partial<DeadAssetsFilterConfig>) => {
    if (value) onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className={`h-4 w-4 rounded border transition-colors ${enabled ? "bg-primary border-primary" : "border-border"}`}
        />
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dead Assets Filter</label>
      </div>
      <p className="pl-6 text-[10px] text-muted-foreground">
        Excludes assets stuck in a long-term downtrend. Never permanently blacklists — a genuine recovery re-admits the asset automatically.
      </p>

      {enabled && value && (
        <div className="space-y-3 pl-6">
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground">Dead Trend Type</div>
            <CheckboxGroup
              options={DEAD_TREND_TYPE_OPTIONS}
              selected={value.dead_trend_types}
              onChange={(v) => update({ dead_trend_types: v as DeadTrendType[] })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PresetOrCustomField
              label="Lower Highs Required"
              value={value.lower_highs_required}
              presets={[2, 3, 4]}
              onChange={(v) => update({ lower_highs_required: Math.max(1, v) })}
            />
            <PresetOrCustomField
              label="Lower Lows Required"
              value={value.lower_lows_required}
              presets={[2, 3, 4]}
              onChange={(v) => update({ lower_lows_required: Math.max(1, v) })}
            />

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Trend Confirmation</div>
              <select
                value={value.trend_source}
                onChange={(e) =>
                  update({ trend_source: e.target.value as DeadAssetsFilterConfig["trend_source"] })
                }
                className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
              >
                {TREND_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <PresetOrCustomField
              label="Recovery Lookback"
              value={value.recovery_lookback}
              presets={[50, 100, 200, 500]}
              suffix=" candles"
              onChange={(v) => update({ recovery_lookback: Math.max(2, v) })}
            />

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Volume (Flat Dead Asset)</div>
              <select
                value={value.volume_option}
                onChange={(e) =>
                  update({ volume_option: e.target.value as DeadAssetsFilterConfig["volume_option"] })
                }
                className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
              >
                {VOLUME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Volatility (Flat Dead Asset)</div>
              <select
                value={value.volatility_option}
                onChange={(e) =>
                  update({ volatility_option: e.target.value as DeadAssetsFilterConfig["volatility_option"] })
                }
                className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
              >
                {VOLATILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <PresetOrCustomField
              label="Bounce Threshold"
              value={value.bounce_threshold_pct}
              presets={[10, 20, 30, 50]}
              suffix="%"
              onChange={(v) => update({ bounce_threshold_pct: Math.max(0.01, v) })}
            />
            <PresetOrCustomField
              label="Failure Window"
              value={value.failure_window}
              presets={[5, 10, 20]}
              suffix=" candles"
              onChange={(v) => update({ failure_window: Math.max(1, v) })}
            />

            <div className="col-span-2 space-y-1">
              <div className="text-[10px] text-muted-foreground">Recovery Override</div>
              <select
                value={value.recovery_override}
                onChange={(e) =>
                  update({ recovery_override: e.target.value as DeadAssetsFilterConfig["recovery_override"] })
                }
                className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
              >
                {RECOVERY_OVERRIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => onChange({ ...DEFAULT_DEAD_ASSETS_FILTER })}
            className="text-[10px] text-muted-foreground underline hover:text-foreground"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
