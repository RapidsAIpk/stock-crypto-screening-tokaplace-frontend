import {
  CONFLUENCE_UI_SIGNAL_TYPES,
  createConfluenceSource,
  describeConfluenceSelectionConstraint,
  formatConfluenceSelectionLabel,
  getAllowedConfluenceSelections,
  getConfluenceSelectionOptions,
  getDefaultChannelLength,
  getDefaultConfluenceConfig,
  getDefaultConfluenceSelection,
  getMinimumConfluenceSourceLength,
  isConfluenceUiSignalType,
  normalizeConfluenceConfig,
  sanitizeConfluenceUiConfig,
  wouldDuplicateConfluenceSource,
} from "@/types/screener";
import type { ChannelType, Confluence, ConfluenceLineRelation } from "@/types/screener";
import { FieldLabel, FilterToggle } from "./FilterUi";
import { useDeferredNumberField } from "@/hooks/useDeferredNumberField";
import { useEffect, useMemo, useState } from "react";

interface Props {
  value: Confluence | null;
  onChange: (v: Confluence | null) => void;
}

const CHANNELS: ChannelType[] = ["lrc", "regression", "trend"];
const TYPE_LABELS: Record<(typeof CONFLUENCE_UI_SIGNAL_TYPES)[number], string> = {
  bullish: "Bullish",
  bearish: "Bearish",
  breakout: "Breakout",
  role_reversal: "Role Reversal",
};
const TYPE_HELPERS: Record<(typeof CONFLUENCE_UI_SIGNAL_TYPES)[number], string> = {
  bullish: "Dual support across two different channel supports.",
  bearish: "Dual resistance across two different channel resistances.",
  breakout: "Resistance break or support-then-break sequence across two sources.",
  role_reversal: "Source 1 breaks resistance, then Source 2 confirms the flip by holding as support within the same candle or next 3.",
};

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground";
const chipClass = (active: boolean, disabled = false) =>
  `rounded-md border px-2.5 py-1.5 text-xs capitalize transition-colors ${
    disabled
      ? "cursor-not-allowed border-border/50 text-muted-foreground/50"
      : active
        ? "border-primary bg-primary/10 text-accent-foreground"
        : "border-border text-muted-foreground"
  }`;

export function ConfluenceFilter({ value, onChange }: Props) {
  const normalized = useMemo(() => normalizeConfluenceConfig(value), [value]);
  const current = useMemo(
    () => (normalized ? sanitizeConfluenceUiConfig(normalized) : null),
    [normalized],
  );
  const enabled = current !== null;

  useEffect(() => {
    if (!normalized || !current) {
      return;
    }
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      onChange(current);
    }
  }, [current, normalized, onChange]);

  // Kept as free-typed text so the field can be cleared/backspaced while
  // typing a custom multi-digit lookback, instead of snapping back to a
  // clamped number on every keystroke.
  const [lookbackText, setLookbackText] = useState(String(current?.lookback_candles ?? 4));
  useEffect(() => {
    setLookbackText(String(current?.lookback_candles ?? 4));
  }, [current?.lookback_candles]);

  const tolerancePctField = useDeferredNumberField(current?.tolerance_pct ?? 0, (parsed) => {
    update({ tolerance_pct: parsed || 0 });
  });

  const applyConfig = (next: Confluence | null) => {
    if (!next) {
      onChange(null);
      return;
    }
    onChange(sanitizeConfluenceUiConfig(next));
  };

  const toggle = () => {
    if (enabled) {
      onChange(null);
      return;
    }

    const defaults = getDefaultConfluenceConfig();
    const type = isConfluenceUiSignalType(defaults.type) ? defaults.type : "bullish";
    const sources = defaults.source_channel_types.map((channelType, index) =>
      createConfluenceSource(channelType, {}, index, type),
    );

    applyConfig({
      type,
      channels: sources.map((source) => source.channel_type),
      sources,
      liquidity_sweep: defaults.liquidity_sweep,
      lookback_candles: defaults.lookback_candles,
      tolerance_pct: defaults.tolerance_pct,
      reclose_to_first_line: defaults.reclose_to_first_line,
    });
  };

  const update = (patch: Partial<Confluence>) => {
    if (!current) return;
    applyConfig({ ...current, ...patch });
  };

  const updateType = (type: (typeof CONFLUENCE_UI_SIGNAL_TYPES)[number]) => {
    if (!current) return;

    const nextSources = (current.sources ?? []).map((source, index) =>
      createConfluenceSource(
        source.channel_type,
        {
          ...source,
          selection: getDefaultConfluenceSelection(source.channel_type, type, index),
        },
        index,
        type,
      ),
    );

    applyConfig({
      ...current,
      type,
      sources: nextSources,
      channels: nextSources.map((source) => source.channel_type),
    });
  };

  const updateSources = (
    updater: (sources: NonNullable<Confluence["sources"]>) => NonNullable<Confluence["sources"]>,
  ) => {
    if (!current) return;
    const nextSources = updater(current.sources ?? []);
    update({
      sources: nextSources,
      channels: nextSources.map((source) => source.channel_type),
    });
  };

  const updateSource = (
    id: string,
    patch: Partial<NonNullable<Confluence["sources"]>[number]>,
  ) => {
    if (!current || !isConfluenceUiSignalType(current.type)) return;
    const confluenceType = current.type;

    updateSources((sources) =>
      sources.map((source, index) => {
        if (source.id !== id) {
          return source;
        }

        const nextChannelType = (patch.channel_type ?? source.channel_type) as ChannelType;
        const nextSelection =
          patch.selection
          ?? (
            patch.channel_type && patch.channel_type !== source.channel_type
              ? getDefaultConfluenceSelection(nextChannelType, confluenceType, index)
              : source.selection
          );
        const defaultLength = getDefaultChannelLength(nextChannelType);
        const requestedLength = Math.max(
          2,
          Number(patch.length ?? source.length) || defaultLength,
        );
        const nextLength = Math.max(
          getMinimumConfluenceSourceLength(
            sources.map((item, itemIndex) => (
              itemIndex === index
                ? { ...item, channel_type: nextChannelType }
                : item
            )),
            index,
            nextChannelType,
          ),
          requestedLength,
        );

        const candidate = createConfluenceSource(
          nextChannelType,
          {
            ...source,
            ...patch,
            id: source.id,
            selection: nextSelection,
            length: nextLength,
          },
          index,
          confluenceType,
        );

        if (wouldDuplicateConfluenceSource(sources, index, candidate)) {
          return createConfluenceSource(
            nextChannelType,
            {
              ...candidate,
              length: getMinimumConfluenceSourceLength(sources, index, nextChannelType),
              selection: getAllowedConfluenceSelections(confluenceType, nextChannelType, index)
                .find((selection) => !wouldDuplicateConfluenceSource(sources, index, {
                  ...candidate,
                  selection,
                }))
                ?? getDefaultConfluenceSelection(nextChannelType, confluenceType, index),
            },
            index,
            confluenceType,
          );
        }

        return candidate;
      }),
    );
  };

  const signalType = isConfluenceUiSignalType(current?.type) ? current.type : "bullish";

  return (
    <div className="space-y-2">
      <FilterToggle
        enabled={enabled}
        onToggle={toggle}
        label="Channel Confluence"
        info="Detects when price respects two channel lines or zones in sequence — useful for support/resistance confluence setups."
      />
      {enabled && current && (
        <div className="space-y-3 pl-7">
          <div className="space-y-1.5">
            <FieldLabel info={TYPE_HELPERS[signalType]}>Signal Type</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {CONFLUENCE_UI_SIGNAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateType(type)}
                  className={chipClass(current.type === type)}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel info="Exactly 2 selected lines or zones. Source order matters for step 1 then step 2 logic.">
              Sources
            </FieldLabel>

            <div className="space-y-2">
              {(current.sources ?? []).map((source, index) => {
                const allowedSelections = getAllowedConfluenceSelections(
                  signalType,
                  source.channel_type,
                  index,
                );
                const minLength = getMinimumConfluenceSourceLength(
                  current.sources ?? [],
                  index,
                  source.channel_type,
                );

                return (
                  <div
                    key={source.id}
                    className="space-y-2 rounded-md border border-border/70 p-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <FieldLabel>Source {index + 1} Indicator</FieldLabel>
                        <select
                          value={source.channel_type}
                          onChange={(e) =>
                            updateSource(source.id, {
                              channel_type: e.target.value as ChannelType,
                            })
                          }
                          className={inputClass}
                        >
                          {CHANNELS.map((channel) => (
                            <option key={channel} value={channel}>
                              {channel === "lrc"
                                ? "LRC"
                                : channel === "regression"
                                  ? "Regression Channel"
                                  : "Trend Channel"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <FieldLabel>Line / Zone</FieldLabel>
                        <select
                          value={source.selection}
                          onChange={(e) =>
                            updateSource(source.id, {
                              selection: e.target.value as NonNullable<Confluence["sources"]>[number]["selection"],
                            })
                          }
                          className={`${inputClass} capitalize`}
                        >
                          {allowedSelections.map((selection) => {
                            const disabled = wouldDuplicateConfluenceSource(
                              current.sources ?? [],
                              index,
                              { selection },
                            );
                            return (
                              <option key={selection} value={selection} disabled={disabled}>
                                {formatConfluenceSelectionLabel(selection)}
                                {disabled ? " (same as other source)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <FieldLabel>Length</FieldLabel>
                        <input
                          type="number"
                          min={minLength}
                          // Uncontrolled + commit-on-blur: this input lives inside a
                          // `.map()` over sources, so it can't hold its own hook state.
                          // Keying on the committed length forces a remount (picking up
                          // `defaultValue`) only when the value changes from elsewhere -
                          // not on every keystroke - so typing "" then a new number
                          // doesn't get overwritten by the old value on each render.
                          key={`${source.id}-${source.length}`}
                          defaultValue={source.length}
                          onBlur={(e) => {
                            const parsed = e.target.value === "" ? NaN : Number(e.target.value);
                            updateSource(source.id, {
                              length: Number.isFinite(parsed)
                                ? Math.max(minLength, parsed)
                                : getDefaultChannelLength(source.channel_type),
                            });
                          }}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] leading-4 text-muted-foreground">
                      {describeConfluenceSelectionConstraint(signalType, index)}
                      {index === 1 && minLength > 2
                        ? ` Minimum length here is ${minLength} because Source 1 uses the same channel type.`
                        : ""}
                    </div>

                    <div className="space-y-3 border-t border-border/50 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel info="Optional: require price to close above/below any line of this indicator, independent of the line used above.">
                            Close Relation
                          </FieldLabel>
                          <select
                            value={source.line_relation ?? "none"}
                            onChange={(e) =>
                              updateSource(source.id, {
                                line_relation: e.target.value as ConfluenceLineRelation,
                              })
                            }
                            className={inputClass}
                          >
                            <option value="none">None</option>
                            <option value="close_above">Close Above</option>
                            <option value="close_below">Close Below</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel>Target Line</FieldLabel>
                          <select
                            value={source.target_line ?? source.selection}
                            disabled={(source.line_relation ?? "none") === "none"}
                            onChange={(e) =>
                              updateSource(source.id, {
                                target_line: e.target.value as NonNullable<Confluence["sources"]>[number]["target_line"],
                              })
                            }
                            className={`${inputClass} capitalize disabled:opacity-50`}
                          >
                            {getConfluenceSelectionOptions(source.channel_type).map((selection) => (
                              <option key={selection} value={selection}>
                                {formatConfluenceSelectionLabel(selection)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel>Min Bars</FieldLabel>
                          <input
                            type="number"
                            min={0}
                            disabled={(source.line_relation ?? "none") === "none"}
                            value={source.candles_since_close_min ?? ""}
                            onChange={(e) =>
                              updateSource(source.id, {
                                candles_since_close_min:
                                  e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className={`${inputClass} disabled:opacity-50`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>Max Bars</FieldLabel>
                          <input
                            type="number"
                            min={0}
                            disabled={(source.line_relation ?? "none") === "none"}
                            value={source.candles_since_close_max ?? ""}
                            onChange={(e) =>
                              updateSource(source.id, {
                                candles_since_close_max:
                                  e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className={`${inputClass} disabled:opacity-50`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => update({ liquidity_sweep: !current.liquidity_sweep })}
              className={`h-4 w-4 rounded border transition-colors ${current.liquidity_sweep ? "bg-primary border-primary" : "border-border"}`}
            />
            <FieldLabel info="Requires price to sweep liquidity beyond the line before confirming confluence.">
              Require liquidity sweep
            </FieldLabel>
          </div>

          {(signalType === "bullish" || signalType === "role_reversal") && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => update({ reclose_to_first_line: !current.reclose_to_first_line })}
                className={`h-4 w-4 rounded border transition-colors ${current.reclose_to_first_line ? "bg-primary border-primary" : "border-border"}`}
              />
              <FieldLabel info="After Source 1 breaks and Source 2 holds as support, also require price to close back at/above Source 1's line.">
                Require re-close to Source 1 line
              </FieldLabel>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Lookback Candles</FieldLabel>
              <input
                type="text"
                inputMode="numeric"
                value={lookbackText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^\d*$/.test(raw)) {
                    return;
                  }
                  setLookbackText(raw);
                  if (raw !== "") {
                    update({ lookback_candles: Math.max(1, Number(raw) || 1) });
                  }
                }}
                onBlur={() => {
                  if (lookbackText === "" || Number(lookbackText) < 1) {
                    setLookbackText("1");
                    update({ lookback_candles: 1 });
                  }
                }}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Tolerance %</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tolerancePctField.rawText}
                onChange={tolerancePctField.onChange}
                onBlur={tolerancePctField.onBlur}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
