import { useMemo } from "react";
import type {
  DeadAssetsFilter as DeadAssetsFilterConfig,
  DeadTrendType,
} from "@/types/screener";
import { DEFAULT_DEAD_ASSETS_FILTER } from "@/types/screener";
import { CheckboxGroup } from "./CheckboxGroup";
import { PresetOrCustomField } from "./PresetOrCustomField";
import { FieldLabel, FilterToggle } from "./FilterUi";

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

const DEAD_TREND_TYPE_LABELS = Object.fromEntries(
  DEAD_TREND_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<DeadTrendType, string>;

const FIELD_USED_BY: Record<string, DeadTrendType[]> = {
  lower_highs_required: ["strong_dead_trend"],
  lower_lows_required: ["strong_dead_trend"],
  trend_source: ["strong_dead_trend", "slow_bleeding_trend"],
  recovery_lookback: ["strong_dead_trend", "slow_bleeding_trend"],
  bounce_threshold_pct: ["failed_recovery"],
  failure_window: ["failed_recovery"],
  volume_option: ["flat_dead_asset"],
  volatility_option: ["flat_dead_asset"],
  recovery_override: [
    "strong_dead_trend",
    "slow_bleeding_trend",
    "failed_recovery",
    "flat_dead_asset",
  ],
};

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

function usedByLabel(types: DeadTrendType[]): string {
  return types.map((type) => DEAD_TREND_TYPE_LABELS[type]).join(", ");
}

function isFieldActive(selectedTypes: DeadTrendType[], fieldKey: string): boolean {
  const usedBy = FIELD_USED_BY[fieldKey];
  if (!usedBy?.length) {
    return false;
  }
  return usedBy.some((type) => selectedTypes.includes(type));
}

function DeadAssetsSelectField<T extends string>({
  label,
  value,
  options,
  disabled,
  usedBy,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  disabled: boolean;
  usedBy: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className={`space-y-1.5 ${disabled ? "opacity-50" : ""}`}>
      <FieldLabel info={`Used by: ${usedBy}`}>{label}</FieldLabel>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DeadAssetsFilter({ value, onChange }: Props) {
  const enabled = value !== null;

  const toggle = () => {
    onChange(enabled ? null : { ...DEFAULT_DEAD_ASSETS_FILTER });
  };

  const update = (patch: Partial<DeadAssetsFilterConfig>) => {
    if (value) onChange({ ...value, ...patch });
  };

  const selectedTypes = value?.dead_trend_types ?? [];

  const fieldActive = useMemo(
    () => ({
      lowerHighs: isFieldActive(selectedTypes, "lower_highs_required"),
      lowerLows: isFieldActive(selectedTypes, "lower_lows_required"),
      trendSource: isFieldActive(selectedTypes, "trend_source"),
      recoveryLookback: isFieldActive(selectedTypes, "recovery_lookback"),
      bounceThreshold: isFieldActive(selectedTypes, "bounce_threshold_pct"),
      failureWindow: isFieldActive(selectedTypes, "failure_window"),
      volumeOption: isFieldActive(selectedTypes, "volume_option"),
      volatilityOption: isFieldActive(selectedTypes, "volatility_option"),
      recoveryOverride: isFieldActive(selectedTypes, "recovery_override"),
    }),
    [selectedTypes],
  );

  return (
    <div className="space-y-2">
      <FilterToggle
        enabled={enabled}
        onToggle={toggle}
        label="Dead Assets Filter"
        info="Excludes assets stuck in a long-term downtrend. Never permanently blacklists — a genuine recovery re-admits the asset automatically."
      />

      {enabled && value && (
        <div className="space-y-3 pl-7">
          <div className="space-y-1.5">
            <FieldLabel info="Select which patterns to check. Settings below activate only for your selected types.">
              Dead Trend Type
            </FieldLabel>
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
              disabled={!fieldActive.lowerHighs}
              usedBy={usedByLabel(FIELD_USED_BY.lower_highs_required)}
              onChange={(v) => update({ lower_highs_required: Math.max(1, v) })}
            />
            <PresetOrCustomField
              label="Lower Lows Required"
              value={value.lower_lows_required}
              presets={[2, 3, 4]}
              disabled={!fieldActive.lowerLows}
              usedBy={usedByLabel(FIELD_USED_BY.lower_lows_required)}
              onChange={(v) => update({ lower_lows_required: Math.max(1, v) })}
            />

            <DeadAssetsSelectField
              label="Trend Confirmation"
              value={value.trend_source}
              options={TREND_SOURCE_OPTIONS}
              disabled={!fieldActive.trendSource}
              usedBy={usedByLabel(FIELD_USED_BY.trend_source)}
              onChange={(trend_source) => update({ trend_source })}
            />

            <PresetOrCustomField
              label="Recovery Lookback"
              value={value.recovery_lookback}
              presets={[50, 100, 200, 500]}
              suffix=" candles"
              disabled={!fieldActive.recoveryLookback}
              usedBy={usedByLabel(FIELD_USED_BY.recovery_lookback)}
              onChange={(v) => update({ recovery_lookback: Math.max(2, v) })}
            />

            <DeadAssetsSelectField
              label="Volume"
              value={value.volume_option}
              options={VOLUME_OPTIONS}
              disabled={!fieldActive.volumeOption}
              usedBy={usedByLabel(FIELD_USED_BY.volume_option)}
              onChange={(volume_option) => update({ volume_option })}
            />

            <DeadAssetsSelectField
              label="Volatility"
              value={value.volatility_option}
              options={VOLATILITY_OPTIONS}
              disabled={!fieldActive.volatilityOption}
              usedBy={usedByLabel(FIELD_USED_BY.volatility_option)}
              onChange={(volatility_option) => update({ volatility_option })}
            />

            <PresetOrCustomField
              label="Bounce Threshold"
              value={value.bounce_threshold_pct}
              presets={[10, 20, 30, 50]}
              suffix="%"
              disabled={!fieldActive.bounceThreshold}
              usedBy={usedByLabel(FIELD_USED_BY.bounce_threshold_pct)}
              onChange={(v) => update({ bounce_threshold_pct: Math.max(0.01, v) })}
            />
            <PresetOrCustomField
              label="Failure Window"
              value={value.failure_window}
              presets={[5, 10, 20]}
              suffix=" candles"
              disabled={!fieldActive.failureWindow}
              usedBy={usedByLabel(FIELD_USED_BY.failure_window)}
              onChange={(v) => update({ failure_window: Math.max(1, v) })}
            />

            <div className="col-span-2">
              <DeadAssetsSelectField
                label="Recovery Override"
                value={value.recovery_override}
                options={RECOVERY_OVERRIDE_OPTIONS}
                disabled={!fieldActive.recoveryOverride}
                usedBy={usedByLabel(FIELD_USED_BY.recovery_override)}
                onChange={(recovery_override) => update({ recovery_override })}
              />
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
