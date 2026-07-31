import {
  describeChannelRespectCandleWindow,
  getDefaultChannelRespectConfig,
} from "@/types/screener";
import type { ChannelRespect, IndicatorConfig } from "@/types/screener";
import { FieldLabel, FilterToggle } from "./FilterUi";
import { InfoTip } from "@/components/ui/info-tip";

interface Props {
  value: ChannelRespect | null;
  onChange: (v: ChannelRespect | null) => void;
  indicators?: IndicatorConfig[];
}

const CHANNEL_TYPES = ["lrc", "regression", "trend"] as const;

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground";
const chipClass = (active: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
    active ? "border-primary bg-primary/10 text-accent-foreground" : "border-border text-muted-foreground"
  }`;

export function ChannelRespectFilter({ value, onChange, indicators = [] }: Props) {
  const enabled = value !== null;

  const toggle = () => {
    if (enabled) {
      onChange(null);
    } else {
      onChange(getDefaultChannelRespectConfig() as unknown as ChannelRespect);
    }
  };

  const update = (patch: Partial<ChannelRespect>) => {
    if (value) onChange({ ...value, ...patch });
  };

  const lineToSelection = (line?: ChannelRespect["line"]) => {
    switch (line) {
      case "upper":
        return { upper: true, middle: false, lower: false };
      case "lower":
        return { upper: false, middle: false, lower: true };
      case "both":
        return { upper: true, middle: false, lower: true };
      case "upper_middle":
        return { upper: true, middle: true, lower: false };
      case "lower_middle":
        return { upper: false, middle: true, lower: true };
      case "all":
        return { upper: true, middle: true, lower: true };
      case "middle":
      default:
        return { upper: false, middle: true, lower: false };
    }
  };

  const selectionToLine = (upper: boolean, middle: boolean, lower: boolean): ChannelRespect["line"] => {
    if (upper && middle && lower) return "all";
    if (upper && lower) return "both";
    if (upper && middle) return "upper_middle";
    if (lower && middle) return "lower_middle";
    if (upper) return "upper";
    if (lower) return "lower";
    return "middle";
  };

  const { upper: upperSelected, middle: middleSelected, lower: lowerSelected } = lineToSelection(value?.line);

  const updateLineSelection = (nextUpper: boolean, nextMiddle: boolean, nextLower: boolean) => {
    if (!value) return;
    update({ line: selectionToLine(nextUpper, nextMiddle, nextLower) });
  };

  const candleWindow = value
    ? describeChannelRespectCandleWindow(value, indicators)
    : null;

  return (
    <div className="space-y-2">
      <FilterToggle
        enabled={enabled}
        onToggle={toggle}
        label="Channel Respect"
        info="Counts how many times price touched a channel line and bounced back. Assets pass only if their respect count falls within your min/max range."
      />
      {enabled && value && (
        <div className="space-y-3 pl-7">
          {candleWindow ? (
            <div className="flex items-center gap-2 rounded-md border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
              <span className="font-medium text-sky-200/90">Candle window</span>
              <InfoTip
                side="right"
                content={
                  <div className="space-y-1">
                    <div>{candleWindow.touchLabel}</div>
                    <div>{candleWindow.historyLabel}</div>
                    <div>{candleWindow.detail}</div>
                  </div>
                }
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Channel</FieldLabel>
              <select
                value={value.channel_type}
                onChange={(e) => update({ channel_type: e.target.value as ChannelRespect["channel_type"] })}
                className={inputClass}
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "lrc" ? "Linear Regression" : t === "regression" ? "Regression" : "Trend"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel info="You can pair Middle with Upper or Lower, or select all three.">
                Line To Respect
              </FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => updateLineSelection(!upperSelected, middleSelected, lowerSelected)}
                  className={chipClass(upperSelected)}
                >
                  Upper
                </button>
                <button
                  type="button"
                  onClick={() => updateLineSelection(upperSelected, middleSelected, !lowerSelected)}
                  className={chipClass(lowerSelected)}
                >
                  Lower
                </button>
                <button
                  type="button"
                  onClick={() => updateLineSelection(upperSelected, !middleSelected, lowerSelected)}
                  className={chipClass(middleSelected)}
                >
                  Middle
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Minimum Touches</FieldLabel>
              <input
                type="number"
                min="1"
                value={value.min_respect ?? ""}
                onChange={(e) => update({ min_respect: e.target.value ? Number(e.target.value) : null })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Maximum Touches</FieldLabel>
              <input
                type="number"
                min="1"
                value={value.max_respect ?? ""}
                onChange={(e) => update({ max_respect: e.target.value ? Number(e.target.value) : null })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel info="How close a near-miss can be and still count as a touch.">
                Tolerance %
              </FieldLabel>
              <input
                type="number"
                min="0"
                step="0.1"
                value={value.tolerance_pct}
                onChange={(e) => update({ tolerance_pct: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Touch Detail</FieldLabel>
              <select
                value={value.touch_type ?? "wick"}
                onChange={(e) => update({ touch_type: e.target.value as ChannelRespect["touch_type"] })}
                className={inputClass}
              >
                <option value="wick">Wick</option>
                <option value="body">Body</option>
                <option value="both">Wick / Body</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel info="Nearby touches within a few candles count as one respect, not many.">
                Cluster Window (3-5 candles)
              </FieldLabel>
              <input
                type="number"
                min="3"
                max="5"
                value={value.cluster_gap}
                onChange={(e) => update({ cluster_gap: Math.min(5, Math.max(3, Number(e.target.value) || 3)) })}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
