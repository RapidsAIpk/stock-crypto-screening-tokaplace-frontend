import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickChart, Expand, LineChart, Radio, RotateCcw } from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { IndicatorDetail, MarketCandle } from "@/types/screener";
import {
  createLinearRegressionCandles,
  normalizeMarketCandles,
  normalizeRegressionChannel,
  normalizeTrendChannel,
  regressionValueAt,
  trendValueAt,
  type ChartCandle,
  type LinRegSettings,
  type RegressionChannelLine,
} from "./resultDetailChartData";
import {
  addTrendChannelFills,
  buildTrendLineData,
  TREND_BOTTOM_COLOR,
  TREND_CENTER_COLOR,
  TREND_TOP_COLOR,
  TV_BACKGROUND,
} from "./trendChannelChartStyles";

type ChartMode = "price" | "regression" | "trend" | "linreg";
type RangeOption = 20 | 50 | 100 | "all";

interface Props {
  candles: Array<MarketCandle | Record<string, unknown>>;
  indicatorDetails: IndicatorDetail[];
  channels: Record<string, unknown>;
  symbol: string;
  timeframe: string;
  timeZone: string;
  provider?: string | null;
}


const TV_GRID = "#24282f";
const TV_TEXT = "#b2b5be";
const TV_BORDER = "#2a2e39";
const UP_COLOR = "#089981";
const DOWN_COLOR = "#f23645";

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function compactVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
}

function decimalPlaces(value: number): number {
  const fixed = Math.abs(value).toFixed(8).replace(/0+$/, "");
  const decimal = fixed.split(".")[1];
  return decimal?.length || 0;
}

function inferPricePrecision(candles: ChartCandle[]): number {
  const sample = candles.slice(-200).flatMap((candle) => [
    candle.open,
    candle.high,
    candle.low,
    candle.close,
  ]);
  const observed = sample.reduce((maximum, value) => Math.max(maximum, decimalPlaces(value)), 0);
  const smallest = Math.min(...sample.filter((value) => value > 0));
  const minimum = smallest < 0.01 ? 6 : smallest < 1 ? 4 : 2;
  return Math.min(8, Math.max(minimum, observed));
}

function formatPrice(value: number, precision: number): string {
  return value.toFixed(precision).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function unixTime(time: Time): number {
  if (typeof time === "number") return time;
  if (typeof time === "string") return Math.floor(new Date(`${time}T00:00:00Z`).getTime() / 1000);
  return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
}

function formatTime(timestamp: number, timeZone: string, includeDate = true): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    ...(includeDate ? { month: "short", day: "numeric", year: "2-digit" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

function toCandleData(candles: ChartCandle[]): CandlestickData<UTCTimestamp>[] {
  return candles.map((candle) => ({
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

export function ResultDetailChart({
  candles: rawCandles,
  indicatorDetails,
  channels,
  symbol,
  timeframe,
  timeZone,
  provider,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>(() => undefined);
  const candles = useMemo(() => normalizeMarketCandles(rawCandles), [rawCandles]);
  const completedCandles = useMemo(
    () => candles.filter((candle) => candle.is_closed !== false),
    [candles],
  );
  const regressionChannel = useMemo(() => normalizeRegressionChannel(channels), [channels]);
  const trendChannel = useMemo(() => normalizeTrendChannel(channels), [channels]);
  const regressionIndicator = indicatorDetails.find((item) => item.name === "regression");
  const trendIndicator = indicatorDetails.find((item) => item.name === "trend");
  const linRegIndicator = indicatorDetails.find((item) => item.name === "linreg_candles");
  const settings = useMemo(
    () => linRegSettings(linRegIndicator || { name: "linreg_candles", passed: false, config: {} }),
    [linRegIndicator],
  );
  const linRegCandles = useMemo(
    () => createLinearRegressionCandles(completedCandles, settings),
    [completedCandles, settings],
  );
  const initialMode: ChartMode = regressionIndicator && regressionChannel
    ? "regression"
    : trendIndicator && trendChannel
      ? "trend"
      : linRegIndicator
        ? "linreg"
        : "price";
  const [mode, setMode] = useState<ChartMode>(
    initialMode,
  );
  const [range, setRange] = useState<RangeOption>(100);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  useEffect(() => {
    const modeAvailable = (
      mode === "price"
      || (mode === "regression" && Boolean(regressionIndicator && regressionChannel))
      || (mode === "trend" && Boolean(trendIndicator && trendChannel))
      || (mode === "linreg" && Boolean(linRegIndicator))
    );
    if (!modeAvailable) setMode(initialMode);
  }, [
    initialMode,
    linRegIndicator,
    mode,
    regressionChannel,
    regressionIndicator,
    trendChannel,
    trendIndicator,
  ]);

  const source: ChartCandle[] = mode === "linreg" && linRegIndicator
    ? linRegCandles
    : completedCandles;
  const precision = useMemo(() => inferPricePrecision(source), [source]);
  const selectedIndex = useMemo(() => {
    if (hoveredTime === null) return Math.max(0, source.length - 1);
    const index = source.findIndex((candle) => candle.time === hoveredTime);
    return index >= 0 ? index : Math.max(0, source.length - 1);
  }, [hoveredTime, source]);
  const selected = source[selectedIndex];
  const selectedRegression = mode === "regression" && regressionChannel && selected
    ? {
        upper: regressionValueAt(regressionChannel, "upper", selectedIndex, source.length),
        q3: regressionValueAt(regressionChannel, "q3", selectedIndex, source.length),
        middle: regressionValueAt(regressionChannel, "middle", selectedIndex, source.length),
        q1: regressionValueAt(regressionChannel, "q1", selectedIndex, source.length),
        lower: regressionValueAt(regressionChannel, "lower", selectedIndex, source.length),
      }
    : null;
  const selectedTrend = mode === "trend" && trendChannel && selected
    ? {
        top: trendValueAt(trendChannel, "top", selectedIndex, source.length),
        topZoneLower: trendValueAt(
          trendChannel,
          "top_zone_lower",
          selectedIndex,
          source.length,
        ),
        middle: trendValueAt(trendChannel, "middle", selectedIndex, source.length),
        bottomZoneUpper: trendValueAt(
          trendChannel,
          "bottom_zone_upper",
          selectedIndex,
          source.length,
        ),
        bottom: trendValueAt(trendChannel, "bottom", selectedIndex, source.length),
      }
    : null;

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host || !source.length) return undefined;

    const chart = createChart(host, {
      width: Math.max(320, host.clientWidth),
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: TV_BACKGROUND },
        textColor: TV_TEXT,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: TV_GRID, style: LineStyle.Dotted },
        horzLines: { color: TV_GRID, style: LineStyle.Dotted },
      },
      rightPriceScale: {
        visible: true,
        borderColor: TV_BORDER,
        entireTextOnly: true,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        visible: true,
        borderColor: TV_BORDER,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 9,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        tickMarkFormatter: (time) => new Intl.DateTimeFormat(undefined, {
          timeZone,
          ...(timeframe.includes("day")
            ? { month: "short", day: "numeric" }
            : { hour: "2-digit", minute: "2-digit", hour12: false }),
        }).format(new Date(unixTime(time) * 1000)),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#758696",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#363a45",
          labelVisible: true,
        },
        horzLine: {
          color: "#758696",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#363a45",
          labelVisible: true,
        },
      },
      localization: {
        priceFormatter: (price) => formatPrice(price, precision),
        timeFormatter: (time) => formatTime(unixTime(time), timeZone),
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      kineticScroll: { mouse: true, touch: true },
    });

    if (mode === "trend" && trendChannel) {
      addTrendChannelFills(chart, source, trendChannel, precision);
    }

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      priceFormat: {
        type: "price",
        precision,
        minMove: 10 ** -precision,
      },
      priceLineVisible: true,
      priceLineColor: DOWN_COLOR,
      lastValueVisible: true,
    });
    candleSeries.setData(toCandleData(source));

    const addLine = (
      color: string,
      width: 1 | 2,
      style: LineStyle,
      data: LineData<UTCTimestamp>[],
      lastValueVisible = false,
    ) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        lineStyle: style,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible,
        priceFormat: {
          type: "price",
          precision,
          minMove: 10 ** -precision,
        },
      });
      series.setData(data);
    };

    if (mode === "regression" && regressionChannel) {
      const lineData = (line: RegressionChannelLine): LineData<UTCTimestamp>[] => (
        source.flatMap((candle, candleIndex) => {
          const value = regressionValueAt(regressionChannel, line, candleIndex, source.length);
          return value === null ? [] : [{ time: candle.time as UTCTimestamp, value }];
        })
      );
      addLine("#00e676", 2, LineStyle.Solid, lineData("upper"), true);
      addLine("#00c853", 1, LineStyle.Dashed, lineData("q3"));
      addLine("#d1d4dc", 2, LineStyle.Solid, lineData("middle"), true);
      addLine("#ff5252", 1, LineStyle.Dashed, lineData("q1"));
      addLine("#ff1744", 2, LineStyle.Solid, lineData("lower"), true);
    }

    if (mode === "trend" && trendChannel) {
      addLine(TREND_TOP_COLOR, 2, LineStyle.Solid, buildTrendLineData(source, trendChannel, "top"), true);
      addLine(TREND_CENTER_COLOR, 2, LineStyle.Dashed, buildTrendLineData(source, trendChannel, "middle"), true);
      addLine(TREND_BOTTOM_COLOR, 2, LineStyle.Solid, buildTrendLineData(source, trendChannel, "bottom"), true);
    }

    if (mode === "linreg") {
      const signal = source.flatMap((candle) => (
        candle.signal === undefined
          ? []
          : [{ time: candle.time as UTCTimestamp, value: candle.signal }]
      ));
      addLine("#f8fafc", 2, LineStyle.Solid, signal, true);
    }

    const applyRange = () => {
      if (range === "all" || source.length <= range) {
        chart.timeScale().fitContent();
        return;
      }
      chart.timeScale().setVisibleLogicalRange({
        from: source.length - range - 0.5,
        to: source.length - 0.5 + 6,
      });
    };
    applyRange();
    resetViewRef.current = () => {
      candleSeries.priceScale().applyOptions({ autoScale: true });
      applyRange();
    };

    chart.subscribeCrosshairMove((parameter) => {
      setHoveredTime(parameter.time === undefined ? null : unixTime(parameter.time));
    });

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width: Math.floor(width) });
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      resetViewRef.current = () => undefined;
      chart.remove();
    };
  }, [mode, precision, range, regressionChannel, source, timeZone, timeframe, trendChannel]);

  if (!completedCandles.length) {
    return (
      <div className="rounded-md border border-border/60 bg-background/25 p-4 text-sm text-muted-foreground">
        No completed OHLC candles were returned for this chart.
      </div>
    );
  }

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await wrapperRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={wrapperRef}
      data-testid="trading-chart"
      className="overflow-hidden rounded-lg border border-[#2a2e39] bg-[#0b0e11] text-[#d1d4dc] shadow-2xl"
    >
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-[#2a2e39] bg-[#101215] px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2962ff] text-xs font-bold text-white">
            {symbol.slice(0, 1)}
          </div>
          <span className="font-mono text-sm font-semibold text-white">{symbol}</span>
          <span className="rounded bg-[#1e222d] px-2 py-1 text-xs font-semibold text-[#d1d4dc]">{timeframe}</span>
          <span className="hidden items-center gap-1 text-[10px] uppercase text-[#089981] sm:flex">
            <Radio className="h-3 w-3" />
            {provider || "market data"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Reset horizontal and vertical scales"
            onClick={() => resetViewRef.current()}
            className="rounded p-2 text-[#b2b5be] hover:bg-[#2a2e39] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Toggle fullscreen chart"
            onClick={toggleFullscreen}
            className="rounded p-2 text-[#b2b5be] hover:bg-[#2a2e39] hover:text-white"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#20232a] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("price")}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "price" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
          >
            <CandlestickChart className="h-3.5 w-3.5" />
            Candles
          </button>
          {regressionIndicator && regressionChannel ? (
            <button
              type="button"
              onClick={() => setMode("regression")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "regression" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Regression Channel [DW]
            </button>
          ) : null}
          {trendIndicator && trendChannel ? (
            <button
              type="button"
              onClick={() => setMode("trend")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "trend" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Trend Channel
            </button>
          ) : null}
          {linRegIndicator ? (
            <button
              type="button"
              onClick={() => setMode("linreg")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "linreg" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              LinReg Candles
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {([20, 50, 100, "all"] as RangeOption[]).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setRange(option)}
              className={`min-w-8 rounded px-1.5 py-1 text-[11px] uppercase ${range === option ? "bg-[#2a2e39] text-white" : "text-[#787b86] hover:text-white"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-10 border-b border-[#20232a] px-3 py-1.5 font-mono text-[11px]">
        {selected ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[#787b86]">{formatTime(selected.time, timeZone)}</span>
            <span>O <b className="font-normal text-white">{formatPrice(selected.open, precision)}</b></span>
            <span>H <b className="font-normal text-white">{formatPrice(selected.high, precision)}</b></span>
            <span>L <b className="font-normal text-white">{formatPrice(selected.low, precision)}</b></span>
            <span>C <b className={selected.close >= selected.open ? "font-normal text-[#089981]" : "font-normal text-[#f23645]"}>{formatPrice(selected.close, precision)}</b></span>
            {selected.volume != null ? <span>Vol <b className="font-normal text-white">{compactVolume(selected.volume)}</b></span> : null}
            {selectedRegression?.upper != null ? <span className="text-[#00e676]">Upper {formatPrice(selectedRegression.upper, precision)}</span> : null}
            {selectedRegression?.q3 != null ? <span className="text-[#00c853]">Q3 {formatPrice(selectedRegression.q3, precision)}</span> : null}
            {selectedRegression?.middle != null ? <span className="text-[#d1d4dc]">Middle {formatPrice(selectedRegression.middle, precision)}</span> : null}
            {selectedRegression?.q1 != null ? <span className="text-[#ff5252]">Q1 {formatPrice(selectedRegression.q1, precision)}</span> : null}
            {selectedRegression?.lower != null ? <span className="text-[#ff1744]">Lower {formatPrice(selectedRegression.lower, precision)}</span> : null}
            {selectedTrend?.top != null ? <span style={{ color: TREND_TOP_COLOR }}>Top {formatPrice(selectedTrend.top, precision)}</span> : null}
            {selectedTrend?.topZoneLower != null ? <span style={{ color: TREND_TOP_COLOR }}>Top Zone {formatPrice(selectedTrend.topZoneLower, precision)}</span> : null}
            {selectedTrend?.middle != null ? <span style={{ color: TREND_CENTER_COLOR }}>Middle {formatPrice(selectedTrend.middle, precision)}</span> : null}
            {selectedTrend?.bottomZoneUpper != null ? <span style={{ color: TREND_BOTTOM_COLOR }}>Bottom Zone {formatPrice(selectedTrend.bottomZoneUpper, precision)}</span> : null}
            {selectedTrend?.bottom != null ? <span style={{ color: TREND_BOTTOM_COLOR }}>Bottom {formatPrice(selectedTrend.bottom, precision)}</span> : null}
          </div>
        ) : null}
      </div>

      <div
        ref={chartHostRef}
        data-testid="trading-chart-canvas"
        className="h-[560px] w-full bg-[#0b0e11]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2e39] px-3 py-2 text-[10px] text-[#787b86]">
        <span>
          Drag chart to pan · wheel/pinch to zoom · drag either axis to rescale · double-click an axis to reset
        </span>
        <span>{timeZone} · completed bars only · {source.length} bars</span>
      </div>
    </div>
  );
}
