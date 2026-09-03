import { useState } from "react";
import type { AreaRule, EmaConditionName, EmaConfig, IndicatorConfig, IndicatorName, IndicatorTimeframe, TimeframeMode, TrendyAdxCondition } from "@/types/screener";
import {
  allowedConfirmationPatternsForTypes,
  collectConfirmationTypes,
  EMA_CONDITION_LABELS,
  filterConfirmationPatternsForTypes,
  filterVlrCandlePatternsForDirection,
  vlrAllowedCandlePatterns,
  CONFIRMATION_TYPES,
  DEFAULT_TREND_AREA_RULE,
  INDICATOR_DEFINITIONS,
  TREND_CHANNEL_AREAS,
  TREND_CHANNEL_DISABLED,
  TREND_CHANNEL_LINE_ACTIONS,
  TREND_CHANNEL_ZONE_ACTIONS,
  isPhase2ChannelAction,
  isReclaimChannelAction,
  isTrendAreaRuleDisabled,
  getDefaultIndicatorConfig,
  isChannelLineIndicatorFieldHidden,
  normalizeEmaConfig,
  defaultTrendyAdxCondition,
  isTrendyAdxActiveCondition,
  isTrendyAdxDirectionCondition,
  isTrendyAdxEventCondition,
  trendyAdxConditionsForMode,
  TRENDY_ADX_DIRECTIONS,
} from "@/types/screener";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { ClearableNumberInput } from "./ClearableNumberInput";
import { PresetOrCustomField } from "./PresetOrCustomField";
import { EmaFilterEditor } from "./EmaFilterEditor";

interface Props {
  indicators: IndicatorConfig[];
  onChange: (v: IndicatorConfig[]) => void;
  timeframeMode: TimeframeMode;
  disabledIndicators?: string[];
}

const EMPTY_DISABLED_INDICATORS: string[] = [];

export const INDICATOR_LABELS: Record<IndicatorName, string> = {
  rsi: "RSI",
  wavetrend: "WaveTrend",
  aroon: "Aroon",
  adx: "Trendy ADX",
  vlr: "VLR Precision Filter",
  lrc: "Linear Regression Channel",
  regression: "Regression Channel",
  trend: "Trend Channel",
  linreg_candles: "Linear Regression Candles",
  ema: "EMA",
  macd: "MACD",
  volume: "Volume Spike",
  relative_volume: "Relative Volume",
  current_volume: "Current Volume",
  float: "Float",
  shares_outstanding: "Shares Outstanding",
  volatility: "Volatility",
};

const FIELD_HELP_TEXT: Record<string, string> = {
  window: "Number of candles from signal start until now.",
  confirmation_window: "How many candles after the signal to check (type OR pattern — first match wins).",
  confirmation_types:
    "Direction filter: any matching candle in the window passes. Auto = no type; use patterns only.",
  confirmation_type:
    "Direction filter: any matching candle in the window passes. Auto = no type; use patterns only.",
  confirmation_patterns:
    "Named shapes only (Auto type). With a type selected, only same-direction patterns are shown and sent.",
  candle_confirmation_patterns:
    "Named candle shapes for VLR. Options follow Direction (bullish / bearish / both).",
  tolerance_pct: "Extra tolerance for signal matching. Increase to relax strictness.",
  r_filter: "Ignore trend strength, require Strong (R >= 0.70), or use the 0.50-0.80 band.",
  window_type:
    "Continuous fits a fixed lookback window. Interval resets each UTC day and grows bar-by-bar through that day.",
  interval_step:
    "Only used in Interval mode. Uses every Nth bar from the start of each UTC day and holds the channel between sampled bars.",
  touch_type:
    "Only applies when Signal is Touch. Body checks the open-close body, Wick checks either actual wick, and Both accepts either a body or wick touch.",
  action:
    "Touch checks wick/body against the line. Close checks the candle close. Stay requires the entire candle, including both wicks, to remain on one side.",
  tolerance:
    "Expands the line by this percent for all signal types. 0 = exact line price (after tick rounding on stocks).",
  window_touch:
    "Current consecutive Touch signal must be exactly this many candles old. Shorter and older signals are excluded.",
  window_close:
    "Close/stay condition must have lasted exactly this many candles. 1 = started on the latest candle.",
  confirmation:
    "Optional candlestick confirmation after the line signal (patterns/direction), not a second line rule.",
  show_last_channel: "Keeps the latest detected pivot channel visible after a break, similar to TradingView.",
  wait_for_break: "Locks the active pivot channel in place until a liquidity-style break confirms.",
  lr_length: "TradingView default is 11. Matches Humble LinReg Candles “Linear Regression Length”.",
  signal_smoothing: "TradingView default is 11. Matches “Signal Smoothing” on the white line.",
  sma_signal: "On = Simple MA of LinReg close (TV default). Off = Exponential MA.",
  lin_reg: "On = use smoothed LinReg candles (TV default). Off = use normal price candles.",
  price_position: "Where the LinReg candle sits vs the white signal line.",
  close_location: "Optional extra check on LinReg close. “Any” skips this check.",
  selection_mode: "How selected channel lines or area rules are combined.",
  candles_since_min: "Minimum candles since the selected channel event happened.",
  candles_since_max: "Maximum candles since the selected channel event happened.",
  min_consecutive_below: "Minimum consecutive candles below the channel before a reclaim can pass.",
  below_candles_min: "Minimum candles price stayed below the line before reclaiming.",
  below_candles_max: "Maximum candles price stayed below the line before reclaiming.",
  require_still_above_now: "Requires price to still be above the reclaimed line now.",
};

const RELATIVE_VOLUME_FIELD_HELP_TEXT: Record<string, string> = {
  length: "Must match TradingView's RVOL lookback input. Backend compares against the last completed candle, not the live candle.",
  min_ratio: "Minimum RVOL compares volume / average(previous N volumes).",
  window: "How many completed candles back the selected RVOL signal can occur.",
  vol_alert: "Matches TradingView's Alert when volume reaches input.",
};

const EMA_SUMMARY_ORDER: EmaConditionName[] = [
  "touch_from_above",
  "piercing_from_below",
  "close_above",
  "touched_or_pierced_and_closed_above",
];

const ADX_FIELD_HELP_TEXT: Record<string, string> = {
  window: "Number of completed candles to look back for signals.",
  min_history: "Keep at least 200 candles for TradingView accuracy. Increase for extra margin.",
};

function baseFieldHelpText(indicatorName: IndicatorName, fieldKey: string): string | undefined {
  if (indicatorName === "relative_volume") {
    return RELATIVE_VOLUME_FIELD_HELP_TEXT[fieldKey] ?? FIELD_HELP_TEXT[fieldKey];
  }

  if (indicatorName === "adx") {
    return ADX_FIELD_HELP_TEXT[fieldKey] ?? FIELD_HELP_TEXT[fieldKey];
  }

  return FIELD_HELP_TEXT[fieldKey];
}

function timeframeLabel(tf: IndicatorTimeframe): string {
  if (tf === "primary") return "Gate";
  if (tf === "secondary") return "Entry";
  return "Single";
}

function isTrendZoneArea(area?: string): boolean {
  return Boolean(area?.endsWith("_zone"));
}

function isTrendLineArea(area?: string): boolean {
  return Boolean(area?.endsWith("_line"));
}

function trendActionsForArea(area?: string): readonly string[] {
  if (area === TREND_CHANNEL_DISABLED) {
    return [TREND_CHANNEL_DISABLED];
  }

  return isTrendZoneArea(area)
    ? TREND_CHANNEL_ZONE_ACTIONS
    : TREND_CHANNEL_LINE_ACTIONS;
}

function defaultTrendAction(area?: string): string {
  return isTrendZoneArea(area) ? "entered" : "touched";
}

function normalizedTrendAction(area: AreaRule): string {
  return String(area.action ?? defaultTrendAction(area.area)).trim().toLowerCase();
}

function trendAreaRuleUsesTouchType(area: AreaRule): boolean {
  const action = normalizedTrendAction(area);
  if (action === "touched") return true;
  return isTrendZoneArea(area.area) && (action === "entered" || action === "rejected");
}

function trendAreaRuleUsesBreachControls(area: AreaRule): boolean {
  return normalizedTrendAction(area) === "breach";
}

function trendAreaRuleUsesPhase2Range(area: AreaRule): boolean {
  return isPhase2ChannelAction(normalizedTrendAction(area));
}

function trendAreaRuleUsesReclaimFields(area: AreaRule): boolean {
  return isReclaimChannelAction(normalizedTrendAction(area));
}

function trendAreaRuleHasConfirmationCriteria(area: AreaRule): boolean {
  return Boolean(
    area.confirmation_type
      || (area.confirmation_types?.length ?? 0) > 0
      || (area.confirmation_patterns?.length ?? 0) > 0,
  );
}

function inactiveTrendSubfilterClass(disabled: boolean): string {
  return disabled ? "opacity-45" : "";
}

function formatOptionLabel(fieldKey: string, option: string): string {
  if (fieldKey === "r_filter") {
    if (option === "ignore") return "Ignore";
    if (option === "strong") return "Strong (R >= 0.70)";
    if (option === "balanced") return "0.50 to 0.80";
  }

  if (option === "role_reversal") {
    return "role reversal";
  }

  if (option === TREND_CHANNEL_DISABLED) {
    return "Disabled";
  }

  if (option === "reclaimed_from_below_bullish") {
    return "reclaimed from below + closed above";
  }

  if (option === "rejected_from_above_bullish") {
    return "rejected from above";
  }

  if (option === "rejected_from_below_bearish") {
    return "rejected from below";
  }

  if (option === "piercing_from_below") {
    return "piercing from below";
  }

  return option.replace(/_/g, " ");
}

const CHANNEL_PHASE2_NUMBER_DEFAULTS: Record<string, number> = {
  candles_since_min: 0,
  candles_since_max: 5,
  below_candles_min: 1,
  below_candles_max: 5,
  min_consecutive_below: 1,
};

const CHANNEL_RECLAIM_ONLY_FIELD_KEYS = [
  "min_consecutive_below",
  "below_candles_min",
  "below_candles_max",
  "require_still_above_now",
] as const;

function isChannelPhase2NumberField(fieldKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(CHANNEL_PHASE2_NUMBER_DEFAULTS, fieldKey);
}

function channelPhase2FieldLabel(config: Record<string, unknown>, fieldKey: string, fallback: string): string {
  const isReclaim = isReclaimChannelAction(config.action);
  if (fieldKey === "candles_since_min") return isReclaim ? "Candles Since Reclaim Min" : fallback;
  if (fieldKey === "candles_since_max") return isReclaim ? "Candles Since Reclaim Max" : fallback;
  if (fieldKey === "min_consecutive_below") return "Minimum Consecutive Below";
  if (fieldKey === "below_candles_min") return "Below Candles Min";
  if (fieldKey === "below_candles_max") return "Below Candles Max";
  return fallback;
}

export function IndicatorsFilter({
  indicators,
  onChange,
  timeframeMode,
  disabledIndicators = EMPTY_DISABLED_INDICATORS,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const addableIndicators = INDICATOR_DEFINITIONS.filter(
    (ind) => !disabledIndicators.includes(ind.name),
  );

  const addIndicator = (name: IndicatorName) => {
    const defaultTf: IndicatorTimeframe = timeframeMode === "single" ? "single" : "primary";
    onChange([
      ...indicators,
      {
        name,
        timeframe: defaultTf,
        config: getDefaultIndicatorConfig(name),
      },
    ]);
    setShowAdd(false);
  };

  const removeIndicator = (index: number) => {
    onChange(indicators.filter((_, i) => i !== index));
    const next = { ...collapsed };
    delete next[index];
    setCollapsed(next);
  };

  const updateConfig = (index: number, key: string, value: unknown) => {
    const updated = [...indicators];
    updated[index] = { ...updated[index], config: { ...updated[index].config, [key]: value } };
    onChange(updated);
  };

  const updateConfigPatch = (index: number, patch: Record<string, unknown>) => {
    const updated = [...indicators];
    updated[index] = {
      ...updated[index],
      config: { ...updated[index].config, ...patch },
    };
    onChange(updated);
  };

  const replaceConfig = (index: number, config: Record<string, unknown>) => {
    const updated = [...indicators];
    updated[index] = {
      ...updated[index],
      config,
    };
    onChange(updated);
  };

  const resetIndicatorConfig = (index: number) => {
    const updated = [...indicators];
    updated[index] = { ...updated[index], config: getDefaultIndicatorConfig(updated[index].name) };
    onChange(updated);
  };

  const isFieldHidden = (ind: IndicatorConfig, fieldKey: string): boolean => {
    if (ind.name === "vlr") {
      const direction = ind.config.direction;
      if (fieldKey === "bullish_crossings") {
        return !ind.config.crossing_confirmation || direction === "bearish";
      }
      if (fieldKey === "bearish_crossings") {
        return !ind.config.crossing_confirmation || direction === "bullish";
      }
      if (fieldKey === "crossing_sequence" || fieldKey === "multiple_crossing_requirement") {
        return !ind.config.crossing_confirmation;
      }
      if (fieldKey === "volume_min_ratio") {
        return !ind.config.volume_confirmation;
      }
      if (fieldKey === "candle_confirmation_patterns") {
        return !ind.config.candle_confirmation;
      }
    }

    if (ind.name === "volatility") {
      if (fieldKey === "htf_multiple") {
        return ind.config.htf_selection !== "Multiple Of Current TF";
      }
      if (fieldKey === "fixed_timeframe") {
        return ind.config.htf_selection !== "Fixed TF";
      }
    }

    return false;
  };

  const isIndicatorFieldHidden = (ind: IndicatorConfig, fieldKey: string): boolean => {
    if (isFieldHidden(ind, fieldKey)) {
      return true;
    }
    return isChannelLineIndicatorFieldHidden(ind.name, ind.config, fieldKey);
  };

  const fieldHelpText = (ind: IndicatorConfig, fieldKey: string): string | undefined => {
    if (fieldKey === "window" && (ind.name === "lrc" || ind.name === "regression" || ind.name === "trend")) {
      if (ind.name === "trend") {
        return FIELD_HELP_TEXT.window_touch;
      }
      const action = String(ind.config.action ?? "touch").trim().toLowerCase();
      return action === "touch" ? FIELD_HELP_TEXT.window_touch : FIELD_HELP_TEXT.window_close;
    }
    return baseFieldHelpText(ind.name, fieldKey);
  };

  const updateTimeframe = (index: number, tf: IndicatorTimeframe) => {
    const updated = [...indicators];
    updated[index] = { ...updated[index], timeframe: tf };
    onChange(updated);
  };

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const allowedTimeframes: IndicatorTimeframe[] = timeframeMode === "single" ? ["single"] : ["primary", "secondary"];

  const renderSummary = (ind: IndicatorConfig) => {
    const parts: string[] = [];
    const c = ind.config;
    if (c.location) parts.push(String(c.location));
    if (c.zone) parts.push(String(c.zone));
    if (c.level) parts.push(String(c.level));
    if (c.rule) parts.push(String(c.rule).replace(/_/g, " "));
    if (c.direction) parts.push(String(c.direction).replace(/_/g, " "));
    if (c.price_position) parts.push(String(c.price_position).replace(/_/g, " "));
    if (c.close_location && c.close_location !== "any") {
      parts.push(String(c.close_location).replace(/_/g, " "));
    }
    if (ind.name === "linreg_candles") {
      if (c.signal_smoothing != null) parts.push(`smooth ${c.signal_smoothing}`);
      if (c.sma_signal === false) parts.push("EMA signal");
      if (c.lin_reg === false) parts.push("raw candles");
    }
    if (c.multiplier) parts.push(`x${c.multiplier}`);
    if (ind.name === "trend") {
      const areas = (c.areas as AreaRule[] | undefined) ?? [];
      const activeAreas = areas.filter((area) => !isTrendAreaRuleDisabled(area));
      if (!activeAreas.length && areas.length) {
        parts.push("area rules disabled");
      }
    }
    if (ind.name === "ema") {
      const ema = normalizeEmaConfig(c);
      parts.push(`EMA ${ema.periods.join("/")}`);
      parts.push(ema.selection_mode);
      const activeConditions = EMA_SUMMARY_ORDER
        .filter((name) => ema.conditions[name].enabled)
        .map((name) => EMA_CONDITION_LABELS[name].replace(" From ", " "));
      if (activeConditions.length) {
        parts.push(activeConditions.join(", "));
      }
    }
    return parts.length > 0 ? parts.join(" · ") : "Using defaults";
  };

  const updateAreaRule = (
    indicatorIndex: number,
    areaIndex: number,
    key: keyof AreaRule,
    value: unknown,
  ) => {
    updateAreaRulePatch(indicatorIndex, areaIndex, { [key]: value } as Partial<AreaRule>);
  };

  const updateAreaRulePatch = (
    indicatorIndex: number,
    areaIndex: number,
    patch: Partial<AreaRule>,
  ) => {
    const areas = ((indicators[indicatorIndex].config.areas as AreaRule[]) ?? []).map((area, idx) =>
      idx === areaIndex ? { ...area, ...patch } : area,
    );
    updateConfig(indicatorIndex, "areas", areas);
  };

  const addAreaRule = (indicatorIndex: number) => {
    const areas = ((indicators[indicatorIndex].config.areas as AreaRule[]) ?? []);
    updateConfig(indicatorIndex, "areas", [...areas, { ...DEFAULT_TREND_AREA_RULE }]);
  };

  const removeAreaRule = (indicatorIndex: number, areaIndex: number) => {
    const areas = ((indicators[indicatorIndex].config.areas as AreaRule[]) ?? []).filter((_, idx) => idx !== areaIndex);
    updateConfig(indicatorIndex, "areas", areas.length ? areas : [{ ...DEFAULT_TREND_AREA_RULE }]);
  };

  const adxConditions = (indicatorIndex: number): TrendyAdxCondition[] =>
    (indicators[indicatorIndex].config.conditions as TrendyAdxCondition[]) ?? [];

  const toggleAdxCondition = (indicatorIndex: number, conditionId: string) => {
    const current = adxConditions(indicatorIndex);
    const next = current.some((condition) => condition.id === conditionId)
      ? current.filter((condition) => condition.id !== conditionId)
      : [...current, defaultTrendyAdxCondition(conditionId)];
    updateConfig(indicatorIndex, "conditions", next);
  };

  const updateAdxConditionSub = (indicatorIndex: number, conditionId: string, patch: Partial<TrendyAdxCondition>) => {
    const next = adxConditions(indicatorIndex).map((condition) =>
      condition.id === conditionId ? { ...condition, ...patch } : condition,
    );
    updateConfig(indicatorIndex, "conditions", next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Indicators</label>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {showAdd && (
        <div className="flex flex-wrap gap-2 p-3 rounded-md bg-secondary/50 border border-border">
          {addableIndicators.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No indicators available.
            </p>
          )}
          {addableIndicators.map((ind) => (
            <button
              key={ind.name}
              onClick={() => addIndicator(ind.name)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:border-primary/50 transition-colors"
            >
              {INDICATOR_LABELS[ind.name]}
            </button>
          ))}
        </div>
      )}

      {indicators.length === 0 && (
        <p className="text-xs text-muted-foreground">No indicators added.</p>
      )}

      <div className="space-y-2">
        {indicators.map((ind, idx) => {
          const def = INDICATOR_DEFINITIONS.find((d) => d.name === ind.name);
          const isCollapsed = collapsed[idx] ?? false;

          return (
            <div key={idx} className="rounded-md border border-border bg-secondary/30 overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => toggleCollapse(idx)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-medium text-foreground">{INDICATOR_LABELS[ind.name]}</span>
                  {isCollapsed && (
                    <span className="text-[10px] text-muted-foreground truncate">{renderSummary(ind)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={ind.timeframe}
                    onChange={(e) => updateTimeframe(idx, e.target.value as IndicatorTimeframe)}
                    className="bg-secondary border border-border rounded px-2 py-0.5 text-[10px] text-foreground"
                  >
                    {allowedTimeframes.map((tf) => (
                      <option key={tf} value={tf}>{timeframeLabel(tf)}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => resetIndicatorConfig(idx)}
                    title="Reset to Default"
                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                  >
                    Reset
                  </button>
                  <button onClick={() => removeIndicator(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {!isCollapsed && def && (
                <div className="px-3 pb-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {ind.name === "ema" && (
                      <EmaFilterEditor
                        config={ind.config}
                        onChange={(nextConfig: EmaConfig) => replaceConfig(idx, nextConfig as unknown as Record<string, unknown>)}
                      />
                    )}
                    {def.fields.map((field, fieldIndex) => {
                      if (isIndicatorFieldHidden(ind, field.key)) {
                        return null;
                      }
                      const helpText = fieldHelpText(ind, field.key);
                      const displayLabel = (ind.name === "lrc" || ind.name === "regression")
                        ? channelPhase2FieldLabel(ind.config, field.key, field.label)
                        : field.label;
                      const showSectionHeading =
                        field.section
                        && def.fields
                          .slice(0, fieldIndex)
                          .filter((previous) => !isIndicatorFieldHidden(ind, previous.key))
                          .every((previous) => previous.section !== field.section);
                      return (
                      <div key={field.key} className={field.section ? "contents" : "contents"}>
                      {showSectionHeading && (
                        <div className="col-span-2 mt-2 border-t border-border/60 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {field.section}
                        </div>
                      )}
                      <div
                        className={`space-y-1 ${field.type === "area-list" || field.type === "condition-list" ? "col-span-2" : ""}`}
                      >
                        <div className="text-[10px] text-muted-foreground">{displayLabel}</div>
                        {helpText && (
                          <div className="text-[9px] text-muted-foreground/80">{helpText}</div>
                        )}
                        {field.type === "number" && (ind.name === "lrc" || ind.name === "regression") && isChannelPhase2NumberField(field.key) && (
                          <ClearableNumberInput
                            value={ind.config[field.key] as number | null | undefined}
                            fallback={CHANNEL_PHASE2_NUMBER_DEFAULTS[field.key]}
                            min={field.min ?? 0}
                            step={field.step}
                            aria-label={`${INDICATOR_LABELS[ind.name]} ${displayLabel}`}
                            onCommit={(next) => updateConfig(idx, field.key, next)}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                          />
                        )}
                        {field.type === "number" && !((ind.name === "lrc" || ind.name === "regression") && isChannelPhase2NumberField(field.key)) && (
                          <input
                            type="number"
                            min={field.min ?? (ind.name === "adx" && field.key === "min_history" ? 200 : undefined)}
                            max={field.max}
                            step={field.step}
                            value={(ind.config[field.key] as number) ?? ""}
                            onChange={(e) => updateConfig(idx, field.key, e.target.value ? Number(e.target.value) : null)}
                            onBlur={(e) => {
                              // Clamp on blur, not on every keystroke - clamping live would
                              // make it impossible to type e.g. "250" digit by digit (it'd
                              // snap to 200 after the first "2"). 200 is a hard floor here,
                              // not user-lowerable - anything below it reproduces an
                              // already-fixed TradingView accuracy mismatch.
                              if (ind.name === "adx" && field.key === "min_history") {
                                const value = e.target.value ? Number(e.target.value) : null;
                                if (value !== null && value < 200) {
                                  updateConfig(idx, field.key, 200);
                                }
                              }
                            }}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                          />
                        )}
                        {field.type === "text" && (
                          <input
                            type="text"
                            value={(ind.config[field.key] as string) ?? ""}
                            onChange={(e) => updateConfig(idx, field.key, e.target.value)}
                            placeholder={field.key === "session" ? "0000-0000" : undefined}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                          />
                        )}
                        {field.type === "boolean" && (ind.name === "adx" || ind.name === "volume" || ind.name === "current_volume" || ind.name === "volatility") && (
                          <input
                            type="checkbox"
                            checked={Boolean(ind.config[field.key])}
                            onChange={(e) => updateConfig(idx, field.key, e.target.checked)}
                            className="h-4 w-4 rounded border border-border bg-secondary text-primary"
                          />
                        )}
                        {field.type === "boolean" && ind.name !== "adx" && ind.name !== "volume" && ind.name !== "current_volume" && ind.name !== "volatility" && (
                          <button
                            onClick={() => updateConfig(idx, field.key, !ind.config[field.key])}
                            className={`h-7 w-7 rounded border transition-colors ${
                              ind.config[field.key] ? "bg-primary border-primary" : "border-border"
                            }`}
                          />
                        )}
                        {field.type === "select" && (
                          <select
                            value={(ind.config[field.key] as string) ?? ""}
                            onChange={(e) => {
                              if (ind.name === "adx" && field.key === "mode") {
                                // Switching filter type invalidates the previously selected
                                // conditions (each mode has its own, unrelated catalog).
                                const updated = [...indicators];
                                updated[idx] = {
                                  ...updated[idx],
                                  config: { ...updated[idx].config, mode: e.target.value || null, conditions: [] },
                                };
                                onChange(updated);
                                return;
                              }
                              if (field.key === "confirmation_type") {
                                const nextType = e.target.value || null;
                                const types = nextType ? [nextType] : [];
                                updateConfigPatch(idx, {
                                  confirmation_type: nextType,
                                  confirmation_patterns: filterConfirmationPatternsForTypes(
                                    types,
                                    ind.config.confirmation_patterns as string[] | null | undefined,
                                  ),
                                });
                                return;
                              }
                              if (ind.name === "vlr" && field.key === "direction") {
                                const nextDirection = e.target.value || "both";
                                updateConfigPatch(idx, {
                                  direction: nextDirection,
                                  candle_confirmation_patterns: filterVlrCandlePatternsForDirection(
                                    nextDirection,
                                    ind.config.candle_confirmation_patterns as string[] | null | undefined,
                                  ),
                                });
                                return;
                              }
                              if ((ind.name === "lrc" || ind.name === "regression") && field.key === "action") {
                                const nextAction = e.target.value || "touch";
                                const patch: Record<string, unknown> = { action: nextAction };
                                const isReclaimAction = isReclaimChannelAction(nextAction);
                                if (isPhase2ChannelAction(nextAction)) {
                                  patch.candles_since_min = ind.config.candles_since_min ?? 0;
                                  patch.candles_since_max = ind.config.candles_since_max ?? 5;
                                  patch.window = ind.config.window ?? 1;
                                }
                                if (isReclaimAction) {
                                  patch.min_consecutive_below = ind.config.min_consecutive_below ?? 1;
                                  patch.below_candles_min = ind.config.below_candles_min ?? 1;
                                  patch.below_candles_max = ind.config.below_candles_max ?? 5;
                                  patch.require_still_above_now = ind.config.require_still_above_now ?? true;
                                } else {
                                  CHANNEL_RECLAIM_ONLY_FIELD_KEYS.forEach((key) => {
                                    patch[key] = undefined;
                                  });
                                }
                                updateConfigPatch(idx, patch);
                                return;
                              }
                              updateConfig(idx, field.key, e.target.value || null);
                            }}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                          >
                            <option value="">Auto</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{formatOptionLabel(field.key, opt)}</option>
                            ))}
                          </select>
                        )}
                        {field.type === "multi-select" && (
                          <div className="flex flex-wrap gap-1">
                            {(field.key === "confirmation_patterns"
                              ? allowedConfirmationPatternsForTypes(collectConfirmationTypes(ind.config))
                              : field.key === "candle_confirmation_patterns"
                                ? vlrAllowedCandlePatterns(String(ind.config.direction ?? "both"))
                                : field.options)?.map((opt) => {
                              const arr = (ind.config[field.key] as string[]) || [];
                              const sel = arr.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    if (field.key === "confirmation_types") {
                                      const nextTypes = sel
                                        ? arr.filter((v) => v !== opt)
                                        : [...arr, opt];
                                      updateConfigPatch(idx, {
                                        confirmation_types: nextTypes,
                                        confirmation_patterns: filterConfirmationPatternsForTypes(
                                          nextTypes,
                                          ind.config.confirmation_patterns as string[] | null | undefined,
                                        ),
                                      });
                                      return;
                                    }
                                    const next = sel ? arr.filter((v) => v !== opt) : [...arr, opt];
                                    updateConfig(idx, field.key, next);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                    sel ? "border-primary bg-primary/10 text-accent-foreground" : "border-border text-muted-foreground"
                                  }`}
                                >
                                  {formatOptionLabel(field.key, opt)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {field.type === "area-list" && (
                          <div className="col-span-2 space-y-2 rounded-md border border-border/70 p-2">
                            {(((ind.config[field.key] as AreaRule[]) ?? [])).map((area, areaIdx) => {
                              const disabledRule = isTrendAreaRuleDisabled(area);
                              const areaAction = normalizedTrendAction(area);
                              const touchTypeActive = !disabledRule && trendAreaRuleUsesTouchType(area);
                              const breachControlsActive = !disabledRule && trendAreaRuleUsesBreachControls(area);
                              const phase2RangeActive = !disabledRule && trendAreaRuleUsesPhase2Range(area);
                              const reclaimFieldsActive = !disabledRule && trendAreaRuleUsesReclaimFields(area);
                              const confirmationActive = !disabledRule && Boolean(area.confirmation);
                              const confirmationCriteriaActive = confirmationActive;
                              const confirmationWindowActive = confirmationActive && trendAreaRuleHasConfirmationCriteria(area);
                              return (
                              <div key={`${field.key}-${areaIdx}`} className="space-y-2 rounded border border-border/60 p-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-[10px] text-muted-foreground">Area Rule {areaIdx + 1}</div>
                                  <button onClick={() => removeAreaRule(idx, areaIdx)} className="text-muted-foreground hover:text-destructive">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Area</div>
                                    <select
                                      value={area.area ?? "top_line"}
                                      onChange={(e) => {
                                        const nextArea = e.target.value;
                                        if (nextArea === TREND_CHANNEL_DISABLED) {
                                          updateAreaRulePatch(idx, areaIdx, {
                                            area: TREND_CHANNEL_DISABLED,
                                            action: TREND_CHANNEL_DISABLED,
                                          });
                                          return;
                                        }
                                        const nextActionOptions = trendActionsForArea(nextArea);
                                        const nextAction = nextActionOptions.includes(area.action ?? "")
                                          ? area.action ?? defaultTrendAction(nextArea)
                                          : defaultTrendAction(nextArea);
                                        updateAreaRulePatch(idx, areaIdx, {
                                          area: nextArea,
                                          action: nextAction === TREND_CHANNEL_DISABLED
                                            ? defaultTrendAction(nextArea)
                                            : nextAction,
                                        });
                                      }}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                    >
                                      {TREND_CHANNEL_AREAS.map((option) => (
                                        <option key={option} value={option}>{formatOptionLabel("area", option)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Action</div>
                                    <select
                                      value={area.action ?? defaultTrendAction(area.area)}
                                      onChange={(e) => {
                                        const nextAction = e.target.value;
                                        if (nextAction === TREND_CHANNEL_DISABLED) {
                                          updateAreaRulePatch(idx, areaIdx, { action: TREND_CHANNEL_DISABLED });
                                          return;
                                        }
                                        const isReclaimAction = isReclaimChannelAction(nextAction);
                                        const patch: Record<string, unknown> = {
                                          action: nextAction,
                                          area: area.area === TREND_CHANNEL_DISABLED
                                            ? "top_line"
                                            : area.area,
                                        };
                                        if (isPhase2ChannelAction(nextAction)) {
                                          patch.candles_since_min = area.candles_since_min ?? 0;
                                          patch.candles_since_max = area.candles_since_max ?? 5;
                                          patch.window = area.window ?? 1;
                                        }
                                        if (isReclaimAction) {
                                          patch.min_consecutive_below = area.min_consecutive_below ?? 1;
                                          patch.below_candles_min = area.below_candles_min ?? 1;
                                          patch.below_candles_max = area.below_candles_max ?? 5;
                                          patch.require_still_above_now = area.require_still_above_now ?? true;
                                        } else {
                                          CHANNEL_RECLAIM_ONLY_FIELD_KEYS.forEach((key) => {
                                            patch[key] = undefined;
                                          });
                                        }
                                        updateAreaRulePatch(idx, areaIdx, {
                                          ...patch,
                                        });
                                      }}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                    >
                                      {trendActionsForArea(area.area).map((option) => (
                                        <option key={option} value={option}>{formatOptionLabel("action", option)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {!disabledRule && !isTrendLineArea(area.area) && areaAction === "touched" && (
                                    <div className="col-span-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100">
                                      Touch is only a line action. Choose a line area or switch this zone rule to entered, rejected, or breach.
                                    </div>
                                  )}
                                  {!disabledRule && !isTrendZoneArea(area.area) && (areaAction === "entered" || areaAction === "rejected") && (
                                    <div className="col-span-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100">
                                      Entered/rejected only apply to zones. Choose a zone area or switch this line rule to touched, close, on line, or breach.
                                    </div>
                                  )}
                                  {!disabledRule && (
                                    <div className={`space-y-1 ${inactiveTrendSubfilterClass(!touchTypeActive)}`}>
                                      <div className="text-[10px] text-muted-foreground">
                                        Touch Type
                                      </div>
                                      <select
                                        value={area.touch_type ?? "wick"}
                                        onChange={(e) => updateAreaRulePatch(idx, areaIdx, { touch_type: e.target.value })}
                                        disabled={!touchTypeActive}
                                        title={touchTypeActive ? undefined : "Ignored unless the action checks a touch/entry/rejection overlap."}
                                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                      >
                                        {["wick", "body", "both"].map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {!disabledRule && (
                                    <div className={`space-y-1 ${inactiveTrendSubfilterClass(!breachControlsActive)}`}>
                                      <div className="text-[10px] text-muted-foreground">Breach Type</div>
                                      <select
                                        value={area.breach_type ?? "wick"}
                                        onChange={(e) => updateAreaRulePatch(idx, areaIdx, { breach_type: e.target.value })}
                                        disabled={!breachControlsActive}
                                        title={breachControlsActive ? undefined : "Ignored unless Action is breach."}
                                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                      >
                                        {["wick", "body", "both"].map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {!disabledRule && (
                                    <div className={`space-y-1 ${inactiveTrendSubfilterClass(!breachControlsActive)}`}>
                                      <div className="text-[10px] text-muted-foreground">Breach Direction</div>
                                      <select
                                        value={area.breach_direction ?? "any"}
                                        onChange={(e) => updateAreaRule(idx, areaIdx, "breach_direction", e.target.value)}
                                        disabled={!breachControlsActive}
                                        title={breachControlsActive ? undefined : "Ignored unless Action is breach."}
                                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                      >
                                        {["any", "up", "down"].map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {!disabledRule && (
                                  <>
                                  {!phase2RangeActive && (
                                    <div className="space-y-1">
                                      <div className="text-[10px] text-muted-foreground">Window</div>
                                      <input
                                        type="number"
                                        value={(area.window as number | null) ?? ""}
                                        onChange={(e) => updateAreaRule(idx, areaIdx, "window", e.target.value === "" ? null : Number(e.target.value))}
                                        onBlur={(e) => {
                                          if (!e.target.value) {
                                            updateAreaRule(idx, areaIdx, "window", 1);
                                          }
                                        }}
                                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                      />
                                    </div>
                                  )}
                                  {phase2RangeActive && (
                                    <>
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground">
                                          {reclaimFieldsActive ? "Candles Since Reclaim Min" : "Candles Since Min"}
                                        </div>
                                        <ClearableNumberInput
                                          value={area.candles_since_min as number | null | undefined}
                                          fallback={0}
                                          aria-label={`Area Rule ${areaIdx + 1} ${reclaimFieldsActive ? "Candles Since Reclaim Min" : "Candles Since Min"}`}
                                          onCommit={(next) => updateAreaRule(idx, areaIdx, "candles_since_min", next)}
                                          className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground">
                                          {reclaimFieldsActive ? "Candles Since Reclaim Max" : "Candles Since Max"}
                                        </div>
                                        <ClearableNumberInput
                                          value={area.candles_since_max as number | null | undefined}
                                          fallback={5}
                                          aria-label={`Area Rule ${areaIdx + 1} ${reclaimFieldsActive ? "Candles Since Reclaim Max" : "Candles Since Max"}`}
                                          onCommit={(next) => updateAreaRule(idx, areaIdx, "candles_since_max", next)}
                                          className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                        />
                                      </div>
                                    </>
                                  )}
                                  {reclaimFieldsActive && (
                                    <>
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground">Minimum Consecutive Below</div>
                                        <ClearableNumberInput
                                          value={area.min_consecutive_below as number | null | undefined}
                                          fallback={1}
                                          min={1}
                                          aria-label={`Area Rule ${areaIdx + 1} Minimum Consecutive Below`}
                                          onCommit={(next) => updateAreaRule(idx, areaIdx, "min_consecutive_below", next)}
                                          className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground">Below Candles Min</div>
                                        <ClearableNumberInput
                                          value={area.below_candles_min as number | null | undefined}
                                          fallback={1}
                                          aria-label={`Area Rule ${areaIdx + 1} Below Candles Min`}
                                          onCommit={(next) => updateAreaRule(idx, areaIdx, "below_candles_min", next)}
                                          className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground">Below Candles Max</div>
                                        <ClearableNumberInput
                                          value={area.below_candles_max as number | null | undefined}
                                          fallback={5}
                                          aria-label={`Area Rule ${areaIdx + 1} Below Candles Max`}
                                          onCommit={(next) => updateAreaRule(idx, areaIdx, "below_candles_max", next)}
                                          className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground">Require Still Above Now</div>
                                        <button
                                          onClick={() => updateAreaRule(idx, areaIdx, "require_still_above_now", area.require_still_above_now === false)}
                                          className={`h-7 w-7 rounded border transition-colors ${
                                            area.require_still_above_now !== false ? "bg-primary border-primary" : "border-border"
                                          }`}
                                        />
                                      </div>
                                    </>
                                  )}
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Tolerance %</div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={(area.tolerance as number | null) ?? ""}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "tolerance", e.target.value === "" ? null : Number(e.target.value))}
                                      onBlur={(e) => {
                                        if (!e.target.value) {
                                          updateAreaRule(idx, areaIdx, "tolerance", 0);
                                        }
                                      }}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Require Confirmation</div>
                                    <button
                                      onClick={() => updateAreaRule(idx, areaIdx, "confirmation", !area.confirmation)}
                                      className={`h-7 w-7 rounded border transition-colors ${
                                        area.confirmation ? "bg-primary border-primary" : "border-border"
                                      }`}
                                    />
                                  </div>
                                  <div className={`space-y-1 ${inactiveTrendSubfilterClass(!confirmationCriteriaActive)}`}>
                                    <div className="text-[10px] text-muted-foreground">Confirmation Type</div>
                                    <select
                                      value={area.confirmation_type ?? ""}
                                      onChange={(e) => {
                                        const nextType = e.target.value || null;
                                        const types = nextType ? [nextType] : [];
                                        updateAreaRulePatch(idx, areaIdx, {
                                          confirmation_type: nextType,
                                          confirmation_patterns: filterConfirmationPatternsForTypes(
                                            types,
                                            area.confirmation_patterns,
                                          ),
                                        });
                                      }}
                                      disabled={!confirmationCriteriaActive}
                                      title={confirmationCriteriaActive ? undefined : "Ignored unless Require Confirmation is enabled."}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                    >
                                      <option value="">Auto</option>
                                      {CONFIRMATION_TYPES.map((option) => (
                                        <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className={`space-y-1 ${inactiveTrendSubfilterClass(!confirmationWindowActive)}`}>
                                    <div className="text-[10px] text-muted-foreground">Confirmation Window</div>
                                    <input
                                      type="number"
                                      value={(area.confirmation_window as number | null) ?? ""}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "confirmation_window", e.target.value === "" ? null : Number(e.target.value))}
                                      onBlur={(e) => {
                                        if (!e.target.value) {
                                          updateAreaRule(idx, areaIdx, "confirmation_window", 1);
                                        }
                                      }}
                                      disabled={!confirmationWindowActive}
                                      title={confirmationWindowActive ? undefined : "Ignored until confirmation is enabled and a confirmation type or pattern is selected."}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                    />
                                  </div>
                                  <div className={`space-y-1 col-span-2 ${inactiveTrendSubfilterClass(!confirmationCriteriaActive)}`}>
                                    <div className="text-[10px] text-muted-foreground">Confirmation Patterns</div>
                                    <div className="flex flex-wrap gap-1">
                                      {allowedConfirmationPatternsForTypes(
                                        area.confirmation_type ? [area.confirmation_type] : [],
                                      ).map((option) => {
                                        const selected = (area.confirmation_patterns ?? []).includes(option);
                                        return (
                                          <button
                                            key={option}
                                            disabled={!confirmationCriteriaActive}
                                            title={confirmationCriteriaActive ? undefined : "Ignored unless Require Confirmation is enabled."}
                                            onClick={() => {
                                              const current = area.confirmation_patterns ?? [];
                                              const next = selected
                                                ? current.filter((value) => value !== option)
                                                : [...current, option];
                                              updateAreaRule(idx, areaIdx, "confirmation_patterns", next);
                                            }}
                                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                              selected
                                                ? "border-primary bg-primary/10 text-accent-foreground"
                                                : "border-border text-muted-foreground"
                                            } disabled:cursor-not-allowed disabled:opacity-45`}
                                          >
                                            {option.replace(/_/g, " ")}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  </>
                                  )}
                                  {disabledRule && (
                                    <div className="col-span-2 rounded border border-dashed border-border/70 px-2 py-2 text-[10px] text-muted-foreground">
                                      This area rule is disabled and will be skipped during screening.
                                    </div>
                                  )}
                                </div>
                              </div>
                              );
                            })}
                            <button
                              onClick={() => addAreaRule(idx)}
                              className="rounded border border-border px-2 py-1 text-[10px] text-foreground transition-colors hover:border-primary/60"
                            >
                              + Add Area Rule
                            </button>
                          </div>
                        )}
                        {field.type === "condition-list" && (
                          <div className="col-span-2 space-y-3 rounded-md border border-border/70 p-2">
                            {trendyAdxConditionsForMode(String(ind.config.mode ?? "")).length === 0 && (
                              <p className="text-[10px] text-muted-foreground">Choose a Filter Type above to see its conditions.</p>
                            )}
                            {(() => {
                              const allConds = trendyAdxConditionsForMode(String(ind.config.mode ?? ""));
                              // Group by category
                              const categories: Record<string, typeof allConds> = {};
                              allConds.forEach((c) => {
                                const cat = c.category || "General Conditions";
                                if (!categories[cat]) categories[cat] = [];
                                categories[cat].push(c);
                              });

                              return Object.entries(categories).map(([catName, condList]) => (
                                <div key={catName} className="space-y-1.5 border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
                                  <h5 className="text-[11px] font-semibold text-primary/90 tracking-wide uppercase">{catName}</h5>
                                  <div className="space-y-1">
                                    {condList.map((conditionDef) => {
                                      const selected = adxConditions(idx).find((condition) => condition.id === conditionDef.id);
                                      const isSelected = Boolean(selected);
                                      return (
                                        <div
                                          key={conditionDef.id}
                                          className={`space-y-1 rounded border p-2 transition-colors ${
                                            isSelected
                                              ? "border-emerald-500/60 bg-emerald-500/10"
                                              : "border-border/60 hover:bg-secondary/40"
                                          }`}
                                        >
                                          <div className="flex items-start gap-2">
                                            <button
                                              onClick={() => toggleAdxCondition(idx, conditionDef.id)}
                                              className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
                                                isSelected ? "bg-emerald-500 border-emerald-500" : "border-border"
                                              }`}
                                            />
                                            <span className="text-xs text-foreground">{conditionDef.label}</span>
                                          </div>
                                          {isSelected && isTrendyAdxDirectionCondition(conditionDef.id) && (
                                            <div className="grid gap-2 pl-6 sm:grid-cols-3">
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Direction
                                                </label>
                                                <select
                                                  value={String(selected?.direction ?? "any")}
                                                  onChange={(event) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, { direction: event.target.value as TrendyAdxCondition["direction"] })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                >
                                                  {TRENDY_ADX_DIRECTIONS.map((direction) => (
                                                    <option key={direction} value={direction}>
                                                      {direction.replace(/_/g, " ")}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Candles Since Direction Change Min
                                                </label>
                                                <ClearableNumberInput
                                                  value={selected?.candles_since_direction_change_min as number | null | undefined}
                                                  fallback={0}
                                                  onCommit={(next) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, {
                                                      candles_since_direction_change_min: next,
                                                    })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Candles Since Direction Change Max
                                                </label>
                                                <ClearableNumberInput
                                                  value={selected?.candles_since_direction_change_max as number | null | undefined}
                                                  fallback={5}
                                                  onCommit={(next) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, {
                                                      candles_since_direction_change_max: next,
                                                    })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                />
                                              </div>
                                            </div>
                                          )}
                                          {isSelected && isTrendyAdxEventCondition(conditionDef.id) && (
                                            <div className="grid gap-2 pl-6 sm:grid-cols-2">
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Candles Since Event Min
                                                </label>
                                                <ClearableNumberInput
                                                  value={selected?.candles_since_min as number | null | undefined}
                                                  fallback={0}
                                                  onCommit={(next) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, {
                                                      candles_since_min: next,
                                                    })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Candles Since Event Max
                                                </label>
                                                <ClearableNumberInput
                                                  value={selected?.candles_since_max as number | null | undefined}
                                                  fallback={5}
                                                  onCommit={(next) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, {
                                                      candles_since_max: next,
                                                    })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                />
                                              </div>
                                            </div>
                                          )}
                                          {isSelected && isTrendyAdxActiveCondition(conditionDef.id) && (
                                            <div className="grid gap-2 pl-6 sm:grid-cols-2">
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Consecutive Active Min
                                                </label>
                                                <ClearableNumberInput
                                                  value={selected?.active_candles_min as number | null | undefined}
                                                  fallback={1}
                                                  onCommit={(next) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, {
                                                      active_candles_min: next,
                                                    })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  Consecutive Active Max
                                                </label>
                                                <ClearableNumberInput
                                                  value={selected?.active_candles_max as number | null | undefined}
                                                  fallback={5}
                                                  onCommit={(next) =>
                                                    updateAdxConditionSub(idx, conditionDef.id, {
                                                      active_candles_max: next,
                                                    })
                                                  }
                                                  className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-[16px] sm:text-xs text-foreground"
                                                />
                                              </div>
                                            </div>
                                          )}
                                          {isSelected && conditionDef.sub === "distance" && (
                                            <div className="pl-6">
                                              <PresetOrCustomField
                                                label="Distance / Closeness (indicator points)"
                                                value={(selected?.distance as number | null | undefined) ?? null}
                                                presets={[0.5, 1, 2, 3, 5]}
                                                allowEmpty
                                                emptyLabel="Any (default)"
                                                onChange={(v) => updateAdxConditionSub(idx, conditionDef.id, { distance: v })}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
