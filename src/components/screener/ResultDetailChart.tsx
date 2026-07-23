import { useMemo, useState, type PointerEvent } from "react";
import { CandlestickChart, LineChart, Radio } from "lucide-react";
import type { IndicatorDetail, MarketCandle } from "@/types/screener";
import {
  createLinearRegressionCandles,
  normalizeMarketCandles,
  type ChartCandle,
  type LinRegSettings,
} from "./resultDetailChartData";

type ChartMode = "price" | "linreg";
type RangeOption = 20 | 50 | 100 | "all";

interface Props {
  candles: Array<MarketCandle | Record<string, unknown>>;
  indicatorDetails: IndicatorDetail[];
  symbol: string;
  timeframe: string;
  timeZone: string;
  provider?: string | null;
}

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 430;
const PLOT_LEFT = 16;
const PLOT_RIGHT = 84;
const PLOT_TOP = 24;
const PRICE_BOTTOM = 326;
const VOLUME_TOP = 340;
const VOLUME_BOTTOM = 382;

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function compactPrice(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 1) return value.toFixed(2);
  return value.toPrecision(4);
}

function compactVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatTime(timestamp: number, timeZone: string, includeDate = true): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    ...(includeDate ? { month: "short", day: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function linRegSettings(indicator: IndicatorDetail): LinRegSettings {
  return {
    lrLength: positiveInteger(indicator.config.lr_length, 11),
    signalSmoothing: positiveInteger(indicator.config.signal_smoothing, 11),
    smaSignal: indicator.config.sma_signal !== false,
    linReg: indicator.config.lin_reg !== false,
  };
}

export function ResultDetailChart({
  candles: rawCandles,
  indicatorDetails,
  symbol,
  timeframe,
  timeZone,
  provider,
}: Props) {
  const candles = useMemo(() => normalizeMarketCandles(rawCandles), [rawCandles]);
  const linRegIndicator = indicatorDetails.find((item) => item.name === "linreg_candles");
  const settings = useMemo(
    () => linRegSettings(linRegIndicator || { name: "linreg_candles", passed: false, config: {} }),
    [linRegIndicator],
  );
  const linRegCandles = useMemo(
    () => createLinearRegressionCandles(candles, settings),
    [candles, settings],
  );
  const [mode, setMode] = useState<ChartMode>(linRegIndicator ? "linreg" : "price");
  const [range, setRange] = useState<RangeOption>(50);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const source: ChartCandle[] = mode === "linreg" && linRegIndicator ? linRegCandles : candles;
  const visible = range === "all" ? source : source.slice(-range);
  const selectedIndex = hoveredIndex !== null && hoveredIndex < visible.length
    ? hoveredIndex
    : Math.max(0, visible.length - 1);
  const selected = visible[selectedIndex];

  if (!candles.length) {
    return (
      <div className="rounded-md border border-border/60 bg-background/25 p-4 text-sm text-muted-foreground">
        No valid OHLC candles were returned for this chart.
      </div>
    );
  }

  if (!visible.length) {
    return (
      <div className="rounded-md border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
        LinReg needs more completed candles for the selected length.
      </div>
    );
  }

  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const step = plotWidth / visible.length;
  const candleWidth = Math.max(2, Math.min(12, step * 0.62));
  const priceValues = visible.flatMap((candle) => [
    Math.min(candle.open, candle.high, candle.low, candle.close),
    Math.max(candle.open, candle.high, candle.low, candle.close),
    ...(candle.signal === undefined ? [] : [candle.signal]),
  ]);
  const minimum = Math.min(...priceValues);
  const maximum = Math.max(...priceValues);
  const padding = Math.max((maximum - minimum) * 0.08, Math.abs(maximum) * 0.001, 0.000001);
  const domainMin = minimum - padding;
  const domainMax = maximum + padding;
  const priceY = (value: number) => (
    PLOT_TOP + ((domainMax - value) / (domainMax - domainMin)) * (PRICE_BOTTOM - PLOT_TOP)
  );
  const xAt = (index: number) => PLOT_LEFT + step * (index + 0.5);
  const maxVolume = Math.max(...visible.map((candle) => candle.volume || 0), 1);
  const gridPrices = Array.from({ length: 5 }, (_, index) => (
    domainMax - ((domainMax - domainMin) * index) / 4
  ));
  const labelIndexes = [...new Set([0, Math.floor((visible.length - 1) / 2), visible.length - 1])];
  const signalPath = visible
    .map((candle, index) => candle.signal === undefined ? null : `${xAt(index)},${priceY(candle.signal)}`)
    .filter(Boolean)
    .join(" ");

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH;
    const index = Math.floor((chartX - PLOT_LEFT) / step);
    setHoveredIndex(Math.max(0, Math.min(visible.length - 1, index)));
  };

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-[#091014]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{symbol}</span>
            <span className="text-xs text-muted-foreground">{timeframe}</span>
            <span className="flex items-center gap-1 text-[10px] uppercase text-emerald-300">
              <Radio className="h-3 w-3" />
              {provider || "market data"}
            </span>
          </div>
          {selected ? (
            <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] font-mono text-muted-foreground">
              <span>{formatTime(selected.time, timeZone)}</span>
              <span>O <b className="font-normal text-foreground">{compactPrice(selected.open)}</b></span>
              <span>H <b className="font-normal text-foreground">{compactPrice(selected.high)}</b></span>
              <span>L <b className="font-normal text-foreground">{compactPrice(selected.low)}</b></span>
              <span>C <b className={selected.close >= selected.open ? "font-normal text-emerald-300" : "font-normal text-rose-300"}>{compactPrice(selected.close)}</b></span>
              {selected.volume != null ? <span>V <b className="font-normal text-foreground">{compactVolume(selected.volume)}</b></span> : null}
              {selected.signal !== undefined ? <span>Signal <b className="font-normal text-white">{compactPrice(selected.signal)}</b></span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-8 rounded-md border border-border/70 bg-background/40 p-0.5">
            <button
              type="button"
              title="Show Massive price candles"
              onClick={() => setMode("price")}
              className={`flex items-center gap-1.5 rounded px-2 text-xs transition-colors ${mode === "price" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <CandlestickChart className="h-3.5 w-3.5" />
              Price
            </button>
            {linRegIndicator ? (
              <button
                type="button"
                title="Show Linear Regression candles and signal"
                onClick={() => setMode("linreg")}
                className={`flex items-center gap-1.5 rounded px-2 text-xs transition-colors ${mode === "linreg" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LineChart className="h-3.5 w-3.5" />
                LinReg
              </button>
            ) : null}
          </div>
          <div className="inline-flex h-8 rounded-md border border-border/70 bg-background/40 p-0.5">
            {([20, 50, 100, "all"] as RangeOption[]).map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setRange(option)}
                className={`min-w-8 rounded px-1.5 text-[11px] uppercase transition-colors ${range === option ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <svg
        role="img"
        aria-label={`${symbol} ${mode === "linreg" ? "Linear Regression" : "price"} candlestick chart`}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="block aspect-[2.32/1] min-h-[270px] w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <rect width={CHART_WIDTH} height={CHART_HEIGHT} fill="#091014" />
        {gridPrices.map((price) => {
          const y = priceY(price);
          return (
            <g key={price}>
              <line x1={PLOT_LEFT} x2={CHART_WIDTH - PLOT_RIGHT} y1={y} y2={y} stroke="#233039" strokeWidth="1" />
              <text x={CHART_WIDTH - PLOT_RIGHT + 9} y={y + 4} fill="#81909b" fontSize="11" fontFamily="monospace">
                {compactPrice(price)}
              </text>
            </g>
          );
        })}
        {visible.map((candle, index) => {
          const x = xAt(index);
          const bullish = candle.close >= candle.open;
          const color = bullish ? "#34d399" : "#fb7185";
          const candleHigh = Math.max(candle.open, candle.high, candle.low, candle.close);
          const candleLow = Math.min(candle.open, candle.high, candle.low, candle.close);
          const bodyTop = priceY(Math.max(candle.open, candle.close));
          const bodyBottom = priceY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(1.5, bodyBottom - bodyTop);
          const volumeHeight = ((candle.volume || 0) / maxVolume) * (VOLUME_BOTTOM - VOLUME_TOP);
          return (
            <g key={candle.time} opacity={candle.is_closed === false ? 0.48 : 1}>
              <line x1={x} x2={x} y1={priceY(candleHigh)} y2={priceY(candleLow)} stroke={color} strokeWidth="1.2" />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={color} rx="0.7" />
              <rect
                x={x - candleWidth / 2}
                y={VOLUME_BOTTOM - volumeHeight}
                width={candleWidth}
                height={volumeHeight}
                fill={color}
                opacity="0.26"
              />
            </g>
          );
        })}
        {mode === "linreg" && signalPath ? (
          <polyline points={signalPath} fill="none" stroke="#f8fafc" strokeWidth="1.8" strokeLinejoin="round" />
        ) : null}
        {hoveredIndex !== null ? (
          <line
            x1={xAt(selectedIndex)}
            x2={xAt(selectedIndex)}
            y1={PLOT_TOP}
            y2={VOLUME_BOTTOM}
            stroke="#91a0aa"
            strokeDasharray="4 4"
            opacity="0.65"
          />
        ) : null}
        <line x1={PLOT_LEFT} x2={CHART_WIDTH - PLOT_RIGHT} y1={PRICE_BOTTOM + 7} y2={PRICE_BOTTOM + 7} stroke="#233039" />
        {labelIndexes.map((index) => (
          <text
            key={visible[index].time}
            x={xAt(index)}
            y={CHART_HEIGHT - 18}
            fill="#81909b"
            fontSize="11"
            fontFamily="monospace"
            textAnchor={index === 0 ? "start" : index === visible.length - 1 ? "end" : "middle"}
          >
            {formatTime(visible[index].time, timeZone)}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span><i className="mr-1 inline-block h-2 w-2 bg-emerald-400" />Up</span>
          <span><i className="mr-1 inline-block h-2 w-2 bg-rose-400" />Down</span>
          {mode === "linreg" ? <span><i className="mr-1 inline-block h-0.5 w-3 bg-white align-middle" />Signal</span> : null}
        </div>
        <span>
          {mode === "linreg"
            ? `LR ${settings.lrLength} · ${settings.smaSignal ? "SMA" : "EMA"} ${settings.signalSmoothing} · completed bars only`
            : `${visible.length} of ${candles.length} Massive OHLC bars`}
        </span>
      </div>
    </div>
  );
}
