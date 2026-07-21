import { useState } from "react";
import type { AreaRule, IndicatorConfig, IndicatorName, IndicatorTimeframe, TimeframeMode, TrendyAdxCondition } from "@/types/screener";
import {
  CONFIRMATION_PATTERNS,
  CONFIRMATION_TYPES,
  DEFAULT_TREND_AREA_RULE,
  INDICATOR_DEFINITIONS,
  TREND_CHANNEL_AREAS,
  TREND_CHANNEL_LINE_ACTIONS,
  TREND_CHANNEL_ZONE_ACTIONS,
  getDefaultIndicatorConfig,
  trendyAdxConditionsForMode,
} from "@/types/screener";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { PresetOrCustomField } from "./PresetOrCustomField";

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
  confirmation_window: "How many candles after signal to confirm it.",
  confirmation_types: "Confirmation candle direction or strength required after the signal.",
  confirmation_patterns: "Named candlestick confirmations from the long/short pattern dictionary.",
  tolerance_pct: "Extra tolerance for signal matching. Increase to relax strictness.",
  r_filter: "Ignore trend strength, require Strong (R >= 0.70), or use the 0.50-0.80 band.",
  window_type: "Continuous uses every candle in the lookback; Interval samples every nth candle.",
  interval_step: "Used when Window Type is Interval. Example: 2 reads every second candle.",
  show_last_channel: "Keeps the latest detected pivot channel visible after a break, similar to TradingView.",
  wait_for_break: "Locks the active pivot channel in place until a liquidity-style break confirms.",
};

function timeframeLabel(tf: IndicatorTimeframe): string {
  if (tf === "primary") return "Gate";
  if (tf === "secondary") return "Entry";
  return "Single";
}

function isTrendZoneArea(area?: string): boolean {
  return Boolean(area?.endsWith("_zone"));
}

function trendActionsForArea(area?: string): readonly string[] {
  return isTrendZoneArea(area)
    ? TREND_CHANNEL_ZONE_ACTIONS
    : TREND_CHANNEL_LINE_ACTIONS;
}

function defaultTrendAction(area?: string): string {
  return isTrendZoneArea(area) ? "entered" : "touched";
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

  return option.replace(/_/g, " ");
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

  const resetIndicatorConfig = (index: number) => {
    const updated = [...indicators];
    updated[index] = { ...updated[index], config: getDefaultIndicatorConfig(updated[index].name) };
    onChange(updated);
  };

  const isVlrFieldHidden = (ind: IndicatorConfig, fieldKey: string): boolean => {
    if (ind.name !== "vlr") return false;
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
    return false;
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
    if (c.multiplier) parts.push(`x${c.multiplier}`);
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
      : [...current, { id: conditionId }];
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
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Indicators</label>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {showAdd && (
        <div className="flex flex-wrap gap-2 p-3 rounded-md bg-secondary/50 border border-border">
          {addableIndicators.length === 0 && (
            <p className="text-xs text-muted-foreground">
              All indicators have been disabled in Settings.
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
                    {def.fields.map((field) => {
                      if (isVlrFieldHidden(ind, field.key)) {
                        return null;
                      }
                      return (
                      <div
                        key={field.key}
                        className={`space-y-1 ${field.type === "area-list" || field.type === "condition-list" ? "col-span-2" : ""}`}
                      >
                        <div className="text-[10px] text-muted-foreground">{field.label}</div>
                        {FIELD_HELP_TEXT[field.key] && (
                          <div className="text-[9px] text-muted-foreground/80">{FIELD_HELP_TEXT[field.key]}</div>
                        )}
                        {field.type === "number" && (
                          <input
                            type="number"
                            min={ind.name === "adx" && field.key === "min_history" ? 200 : undefined}
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
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                          />
                        )}
                        {field.type === "boolean" && (
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
                              updateConfig(idx, field.key, e.target.value || null);
                            }}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                          >
                            <option value="">Auto</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{formatOptionLabel(field.key, opt)}</option>
                            ))}
                          </select>
                        )}
                        {field.type === "multi-select" && (
                          <div className="flex flex-wrap gap-1">
                            {field.options?.map((opt) => {
                              const arr = (ind.config[field.key] as string[]) || [];
                              const sel = arr.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  onClick={() => {
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
                            {(((ind.config[field.key] as AreaRule[]) ?? [])).map((area, areaIdx) => (
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
                                        const nextActionOptions = trendActionsForArea(nextArea);
                                        const nextAction = nextActionOptions.includes(area.action ?? "")
                                          ? area.action ?? defaultTrendAction(nextArea)
                                          : defaultTrendAction(nextArea);
                                        updateAreaRulePatch(idx, areaIdx, {
                                          area: nextArea,
                                          action: nextAction,
                                        });
                                      }}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                    >
                                      {TREND_CHANNEL_AREAS.map((option) => (
                                        <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Action</div>
                                    <select
                                      value={area.action ?? defaultTrendAction(area.area)}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "action", e.target.value)}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                    >
                                      {trendActionsForArea(area.area).map((option) => (
                                        <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {(area.action === "touched" || area.action === "breach") && (
                                    <div className="space-y-1">
                                      <div className="text-[10px] text-muted-foreground">
                                        {area.action === "breach" ? "Breach Type" : "Touch Type"}
                                      </div>
                                      <select
                                        value={area.action === "breach" ? (area.breach_type ?? "wick") : (area.touch_type ?? "wick")}
                                        onChange={(e) => {
                                          updateAreaRulePatch(idx, areaIdx, area.action === "breach"
                                            ? { breach_type: e.target.value }
                                            : { touch_type: e.target.value });
                                        }}
                                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                      >
                                        {["wick", "body", "both"].map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {area.action === "breach" && (
                                    <div className="space-y-1">
                                      <div className="text-[10px] text-muted-foreground">Breach Direction</div>
                                      <select
                                        value={area.breach_direction ?? "any"}
                                        onChange={(e) => updateAreaRule(idx, areaIdx, "breach_direction", e.target.value)}
                                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                      >
                                        {["any", "up", "down"].map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Window</div>
                                    <input
                                      type="number"
                                      value={(area.window as number) ?? 1}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "window", e.target.value ? Number(e.target.value) : 1)}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Tolerance %</div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={(area.tolerance as number) ?? 0}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "tolerance", e.target.value ? Number(e.target.value) : 0)}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
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
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Confirmation Type</div>
                                    <select
                                      value={area.confirmation_type ?? ""}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "confirmation_type", e.target.value || null)}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                    >
                                      <option value="">Auto</option>
                                      {CONFIRMATION_TYPES.map((option) => (
                                        <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground">Confirmation Window</div>
                                    <input
                                      type="number"
                                      value={(area.confirmation_window as number) ?? 1}
                                      onChange={(e) => updateAreaRule(idx, areaIdx, "confirmation_window", e.target.value ? Number(e.target.value) : 1)}
                                      className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <div className="text-[10px] text-muted-foreground">Confirmation Patterns</div>
                                    <div className="flex flex-wrap gap-1">
                                      {CONFIRMATION_PATTERNS.map((option) => {
                                        const selected = (area.confirmation_patterns ?? []).includes(option);
                                        return (
                                          <button
                                            key={option}
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
                                            }`}
                                          >
                                            {option.replace(/_/g, " ")}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => addAreaRule(idx)}
                              className="rounded border border-border px-2 py-1 text-[10px] text-foreground transition-colors hover:border-primary/60"
                            >
                              + Add Area Rule
                            </button>
                          </div>
                        )}
                        {field.type === "condition-list" && (
                          <div className="col-span-2 space-y-2 rounded-md border border-border/70 p-2">
                            {trendyAdxConditionsForMode(String(ind.config.mode ?? "")).length === 0 && (
                              <p className="text-[10px] text-muted-foreground">Choose a Filter Type above to see its conditions.</p>
                            )}
                            {trendyAdxConditionsForMode(String(ind.config.mode ?? "")).map((conditionDef) => {
                              const selected = adxConditions(idx).find((condition) => condition.id === conditionDef.id);
                              const isSelected = Boolean(selected);
                              return (
                                <div key={conditionDef.id} className="space-y-1 rounded border border-border/60 p-2">
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={() => toggleAdxCondition(idx, conditionDef.id)}
                                      className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
                                        isSelected ? "bg-primary border-primary" : "border-border"
                                      }`}
                                    />
                                    <span className="text-xs text-foreground">{conditionDef.label}</span>
                                  </div>
                                  {isSelected && conditionDef.sub === "candles_since" && (
                                    <div className="pl-6">
                                      <PresetOrCustomField
                                        label="Candles Since Event"
                                        value={(selected?.candles_since as number) ?? 0}
                                        presets={[0, 1, 2, 3, 5, 10]}
                                        suffix=" candles ago"
                                        onChange={(v) => updateAdxConditionSub(idx, conditionDef.id, { candles_since: v })}
                                      />
                                    </div>
                                  )}
                                  {isSelected && conditionDef.sub === "distance" && (
                                    <div className="pl-6">
                                      <PresetOrCustomField
                                        label="Distance / Closeness (indicator points)"
                                        value={(selected?.distance as number) ?? 1}
                                        presets={[0.5, 1, 2, 3, 5]}
                                        onChange={(v) => updateAdxConditionSub(idx, conditionDef.id, { distance: v })}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
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
