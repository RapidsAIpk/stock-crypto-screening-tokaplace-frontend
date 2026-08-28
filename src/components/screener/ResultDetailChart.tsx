import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickChart, Expand, LineChart, Radio, RotateCcw } from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type LineData,
  type LogicalRange,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { FilterDetail, IndicatorDetail, MarketCandle } from "@/types/screener";
import {
  ADR_ABOVE_AVERAGE_COLOR,
  ADR_BELOW_AVERAGE_COLOR,
  ADR_HIGHLIGHT_COLOR,
  adrThresholdLabel,
  CHANNEL_RESPECT_HIGHLIGHT_COLOR,
  INTERACTION_BELOW_COLOR,
  INTERACTION_CONTEXT_COLOR,
  INTERACTION_EVENT_COLOR,
  INTERACTION_STILL_ABOVE_COLOR,
  GAP_DOWN_FILL_COLOR,
  GAP_DOWN_HIGHLIGHT_COLOR,
  GAP_UP_FILL_COLOR,
  GAP_UP_HIGHLIGHT_COLOR,
  CONFLUENCE_SOURCE_COLORS,
  createLinearRegressionCandles,
  LIQUIDITY_SWEEP_HIGHLIGHT_COLOR,
  normalizeAdrChartWindow,
  normalizeConfluenceChartSources,
  normalizeGapChartWindow,
  normalizeLrcChannel,
  normalizeMarketCandles,
  normalizeRegressionChannel,
  normalizeTrendChannel,
  regressionValueAt,
  resolveAdrCandleReasons,
  resolveChannelInteractionCandleReasons,
  resolveChannelInteractionSummaries,
  resolveChannelRespectCandleReasons,
  resolveGapCandleReasons,
  resolveChartChannelVisibility,
  resolveConfluenceCandleReasons,
  trendValueAt,
  type AdrChartWindow,
  type CandleMatchReason,
  type GapChartWindow,
  type ChartCandle,
  type ConfluenceChartSource,
  type LinRegSettings,
  type RegressionChannelLine,
} from "./resultDetailChartData";
import {
  addPriceBandFill,
  addTrendChannelFills,
  buildTrendLineData,
  TREND_BOTTOM_COLOR,
  TREND_CENTER_COLOR,
  TREND_TOP_COLOR,
  TV_BACKGROUND,
} from "./trendChannelChartStyles";

type ChartMode = "price" | "confluence" | "lrc" | "regression" | "trend" | "linreg" | "adr" | "gap";
type RangeOption = 20 | 50 | 100 | "all";
type TrendyAdxPoint = {
  time: number;
  plusDi: number | null;
  minusDi: number | null;
  adx: number | null;
};

interface Props {
  candles: Array<MarketCandle | Record<string, unknown>>;
  indicatorDetails: IndicatorDetail[];
  filterDetails?: FilterDetail[];
  channels: Record<string, unknown>;
  confluenceChannels?: Record<string, unknown>;
  requestFilters?: Record<string, unknown> | null;
  symbol: string;
  timeframe: string;
  timeZone: string;
  provider?: string | null;
}

interface CandleTooltipState {
  x: number;
  y: number;
  time: number;
  reasons: CandleMatchReason[];
}

const TV_GRID = "#24282f";
const TV_TEXT = "#b2b5be";
const TV_BORDER = "#2a2e39";
const UP_COLOR = "#089981";
const DOWN_COLOR = "#f23645";
const ADX_PLUS_COLOR = "#ff00ff";
const ADX_MINUS_COLOR = "#004cff";
const ADX_STRENGTH_COLOR = "#facc15";
const ADX_THRESHOLD_COLOR = "#d8d800";
const ADR_AVERAGE_LINE_COLOR = "#38bdf8";
const ADR_THRESHOLD_LINE_COLOR = "#facc15";
const GAP_THRESHOLD_LINE_COLOR = "#facc15";

function confluenceValueAt(
  source: ConfluenceChartSource,
  line: "lower" | "upper" | "mid",
  candleIndex: number,
  candleCount: number,
): number | null {
  const sourceIndex = candleIndex - (candleCount - source.length);
  if (sourceIndex < 0 || sourceIndex >= source.length) return null;
  return source[line][sourceIndex] ?? null;
}

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

function finiteIndicatorValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createTrendyAdxPoints(candles: ChartCandle[], length: number): TrendyAdxPoint[] {
  if (candles.length === 0) return [];

  const plusDi: Array<number | null> = Array(candles.length).fill(null);
  const minusDi: Array<number | null> = Array(candles.length).fill(null);
  const adx: Array<number | null> = Array(candles.length).fill(null);
  const trueRanges = Array(candles.length).fill(0);
  const plusDm = Array(candles.length).fill(0);
  const minusDm = Array(candles.length).fill(0);

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];
    trueRanges[index] = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous.close),
      Math.abs(candle.low - previous.close),
    );

    const upMove = candle.high - previous.high;
    const downMove = previous.low - candle.low;
    plusDm[index] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[index] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let smoothedTr = 0;
  let smoothedPlus = 0;
  let smoothedMinus = 0;
  const dx: Array<number | null> = Array(candles.length).fill(null);

  for (let index = 1; index < candles.length; index += 1) {
    if (index <= length) {
      smoothedTr += trueRanges[index];
      smoothedPlus += plusDm[index];
      smoothedMinus += minusDm[index];
    } else {
      smoothedTr = smoothedTr - (smoothedTr / length) + trueRanges[index];
      smoothedPlus = smoothedPlus - (smoothedPlus / length) + plusDm[index];
      smoothedMinus = smoothedMinus - (smoothedMinus / length) + minusDm[index];
    }

    if (index >= length && smoothedTr > 0) {
      const plus = (100 * smoothedPlus) / smoothedTr;
      const minus = (100 * smoothedMinus) / smoothedTr;
      plusDi[index] = plus;
      minusDi[index] = minus;
      dx[index] = plus + minus === 0 ? 0 : (100 * Math.abs(plus - minus)) / (plus + minus);
    }
  }

  let adxSeed = 0;
  let adxSeedCount = 0;
  for (let index = length; index < candles.length; index += 1) {
    const dxValue = dx[index];
    if (dxValue === null) continue;
    if (adxSeedCount < length) {
      adxSeed += dxValue;
      adxSeedCount += 1;
      if (adxSeedCount === length) {
        adx[index] = adxSeed / length;
      }
      continue;
    }

    const previousAdx = adx[index - 1];
    adx[index] = previousAdx === null ? dxValue : ((previousAdx * (length - 1)) + dxValue) / length;
  }

  return candles.map((candle, index) => ({
    time: candle.time,
    plusDi: plusDi[index],
    minusDi: minusDi[index],
    adx: adx[index],
  }));
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

function toCandleData(
  candles: ChartCandle[],
  candleReasons: Map<number, CandleMatchReason[]> = new Map(),
): CandlestickData<UTCTimestamp>[] {
  return candles.map((candle) => {
    const reasons = candleReasons.get(candle.time);
    return {
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      ...(reasons?.length ? { borderColor: reasons[0].color } : {}),
    };
  });
}

function adxLineData(
  points: TrendyAdxPoint[],
  key: keyof Pick<TrendyAdxPoint, "plusDi" | "minusDi" | "adx">,
): LineData<UTCTimestamp>[] {
  return points.flatMap((point) => (
    point[key] === null ? [] : [{ time: point.time as UTCTimestamp, value: point[key] }]
  ));
}

export function ResultDetailChart({
  candles: rawCandles,
  indicatorDetails,
  filterDetails = [],
  channels,
  confluenceChannels = {},
  requestFilters,
  symbol,
  timeframe,
  timeZone,
  provider,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const adxChartHostRef = useRef<HTMLDivElement>(null);
  const adrChartHostRef = useRef<HTMLDivElement>(null);
  const gapChartHostRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>(() => undefined);
  const candles = useMemo(() => normalizeMarketCandles(rawCandles), [rawCandles]);
  const completedCandles = useMemo(
    () => candles.filter((candle) => candle.is_closed !== false),
    [candles],
  );
  const lrcChannel = useMemo(() => normalizeLrcChannel(channels), [channels]);
  const regressionChannel = useMemo(() => normalizeRegressionChannel(channels), [channels]);
  const trendChannel = useMemo(() => normalizeTrendChannel(channels), [channels]);
  const confluenceSources = useMemo(
    () => normalizeConfluenceChartSources(confluenceChannels, requestFilters),
    [confluenceChannels, requestFilters],
  );
  const showConfluenceChart = confluenceSources.length === 2;
  const adrWindow = useMemo(() => normalizeAdrChartWindow(filterDetails), [filterDetails]);
  const showAdrChart = Boolean(adrWindow);
  const gapWindow = useMemo(() => normalizeGapChartWindow(filterDetails), [filterDetails]);
  const showGapChart = Boolean(gapWindow);
  const linRegIndicator = indicatorDetails.find((item) => item.name === "linreg_candles");
  const adxIndicator = indicatorDetails.find((item) => item.name === "adx");
  const channelVisibility = useMemo(
    () => resolveChartChannelVisibility(indicatorDetails, requestFilters),
    [indicatorDetails, requestFilters],
  );
  const showLrcChart = channelVisibility.lrc && Boolean(lrcChannel);
  const showRegressionChart = channelVisibility.regression && Boolean(regressionChannel);
  const showTrendChart = channelVisibility.trend && Boolean(trendChannel);
  const settings = useMemo(
    () => linRegSettings(linRegIndicator || { name: "linreg_candles", passed: false, config: {} }),
    [linRegIndicator],
  );
  const linRegCandles = useMemo(
    () => createLinearRegressionCandles(completedCandles, settings),
    [completedCandles, settings],
  );
  const adxLength = positiveInteger(adxIndicator?.config.length, 11);
  const adxThreshold = finiteIndicatorValue(adxIndicator?.config.threshold, 20);
  const adxTopLevel = finiteIndicatorValue(adxIndicator?.config.top_level, 19);
  const adxPoints = useMemo(
    () => createTrendyAdxPoints(completedCandles, adxLength),
    [adxLength, completedCandles],
  );
  const requestedChannelType = String(
    (requestFilters?.channel_respect as Record<string, unknown> | undefined)?.channel_type || "",
  ).trim().toLowerCase();
  const requestedChannelMode: ChartMode | null = (
    requestedChannelType === "lrc"
    || requestedChannelType === "regression"
    || requestedChannelType === "trend"
  ) ? requestedChannelType : null;
  const requestedChannelAvailable = (
    (requestedChannelMode === "lrc" && showLrcChart)
    || (requestedChannelMode === "regression" && showRegressionChart)
    || (requestedChannelMode === "trend" && showTrendChart)
  );
  const initialMode: ChartMode = requestedChannelMode && requestedChannelAvailable
    ? requestedChannelMode
    : showConfluenceChart
      ? "confluence"
    : showLrcChart
      ? "lrc"
      : showRegressionChart
        ? "regression"
        : showTrendChart
          ? "trend"
      : linRegIndicator
        ? "linreg"
        : showAdrChart
          ? "adr"
          : showGapChart
            ? "gap"
            : "price";
  const [mode, setMode] = useState<ChartMode>(
    initialMode,
  );
  const [range, setRange] = useState<RangeOption>(100);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [candleTooltip, setCandleTooltip] = useState<CandleTooltipState | null>(null);

  useEffect(() => {
    const modeAvailable = (
      mode === "price"
      || (mode === "confluence" && showConfluenceChart)
      || (mode === "lrc" && showLrcChart)
      || (mode === "regression" && showRegressionChart)
      || (mode === "trend" && showTrendChart)
      || (mode === "linreg" && Boolean(linRegIndicator))
      || (mode === "adr" && showAdrChart)
      || (mode === "gap" && showGapChart)
    );
    if (!modeAvailable) setMode(initialMode);
  }, [
    initialMode,
    linRegIndicator,
    mode,
    showAdrChart,
    showConfluenceChart,
    showGapChart,
    showLrcChart,
    showRegressionChart,
    showTrendChart,
  ]);

  // ADR is a daily-only measure, so its chart plots the completed daily
  // candles the average was taken over - not the scan's own timeframe bars.
  const source: ChartCandle[] = mode === "linreg" && linRegIndicator
    ? linRegCandles
    : mode === "adr" && adrWindow
      ? adrWindow.candles
      : mode === "gap" && gapWindow
        ? gapWindow.candles
        : completedCandles;
  const channelRespectCandleReasons = useMemo(
    () => resolveChannelRespectCandleReasons(filterDetails, requestFilters, mode),
    [filterDetails, mode, requestFilters],
  );
  const confluenceCandleReasons = useMemo(
    () => resolveConfluenceCandleReasons(filterDetails, confluenceSources),
    [confluenceSources, filterDetails],
  );
  const interactionCandleReasons = useMemo(
    () => resolveChannelInteractionCandleReasons(indicatorDetails, mode),
    [indicatorDetails, mode],
  );
  const interactionSummaries = useMemo(
    () => resolveChannelInteractionSummaries(indicatorDetails, mode),
    [indicatorDetails, mode],
  );
  const adrCandleReasons = useMemo(() => resolveAdrCandleReasons(adrWindow), [adrWindow]);
  const gapCandleReasons = useMemo(() => resolveGapCandleReasons(gapWindow), [gapWindow]);
  const candleReasons = mode === "confluence"
    ? confluenceCandleReasons
    : mode === "adr"
      ? adrCandleReasons
      : mode === "gap"
        ? gapCandleReasons
        : interactionCandleReasons.size
          ? interactionCandleReasons
          : channelRespectCandleReasons;
  const precision = useMemo(() => inferPricePrecision(source), [source]);
  const selectedIndex = useMemo(() => {
    if (hoveredTime === null) return Math.max(0, source.length - 1);
    const index = source.findIndex((candle) => candle.time === hoveredTime);
    return index >= 0 ? index : Math.max(0, source.length - 1);
  }, [hoveredTime, source]);
  const selected = source[selectedIndex];
  const selectedAdx = useMemo(() => {
    if (hoveredTime === null) {
      return [...adxPoints].reverse().find((point) => (
        point.plusDi !== null || point.minusDi !== null || point.adx !== null
      ));
    }
    return adxPoints.find((point) => point.time === hoveredTime);
  }, [adxPoints, hoveredTime]);
  const showAdxPane = Boolean(
    adxIndicator
    && mode !== "adr"
    && mode !== "gap"
    && adxPoints.some((point) => point.plusDi !== null || point.minusDi !== null || point.adx !== null),
  );
  const showAdrPane = mode === "adr" && Boolean(adrWindow);
  const showGapPane = mode === "gap" && Boolean(gapWindow);
  const selectedRegression = mode === "regression" && regressionChannel && selected
    ? {
        upper: regressionValueAt(regressionChannel, "upper", selectedIndex, source.length),
        q3: regressionValueAt(regressionChannel, "q3", selectedIndex, source.length),
        middle: regressionValueAt(regressionChannel, "middle", selectedIndex, source.length),
        q1: regressionValueAt(regressionChannel, "q1", selectedIndex, source.length),
        lower: regressionValueAt(regressionChannel, "lower", selectedIndex, source.length),
        tracer: regressionValueAt(regressionChannel, "tracer", selectedIndex, source.length),
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
  const selectedConfluence = mode === "confluence" && selected
    ? confluenceSources.map((confluenceSource) => ({
        source: confluenceSource,
        lower: confluenceValueAt(confluenceSource, "lower", selectedIndex, source.length),
        mid: confluenceValueAt(confluenceSource, "mid", selectedIndex, source.length),
        upper: confluenceValueAt(confluenceSource, "upper", selectedIndex, source.length),
      }))
    : [];
  const selectedAdrRange = mode === "adr" && adrWindow
    ? adrWindow.ranges[selectedIndex] ?? null
    : null;
  const selectedGap = mode === "gap" && gapWindow && selected
    ? gapWindow.gaps.find((gap) => gap.time === selected.time) ?? null
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
        visible: !showAdxPane && !showAdrPane && !showGapPane,
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

    const createPaneChart = (
      host: HTMLDivElement,
      priceFormatter: (price: number) => string,
    ) => createChart(host, {
          width: Math.max(320, host.clientWidth),
          height: 170,
          layout: {
            background: { type: ColorType.Solid, color: TV_BACKGROUND },
            textColor: TV_TEXT,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
            attributionLogo: false,
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
            priceFormatter,
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

    const adxHost = adxChartHostRef.current;
    const adxChart = showAdxPane && adxHost
      ? createPaneChart(adxHost, (price) => price.toFixed(3))
      : null;

    const adrHost = adrChartHostRef.current;
    const adrChart = showAdrPane && adrHost && adrWindow
      ? createPaneChart(adrHost, (price) => formatPrice(price, precision))
      : null;

    const gapHost = gapChartHostRef.current;
    const gapChart = showGapPane && gapHost && gapWindow
      ? createPaneChart(gapHost, (price) => `${price.toFixed(2)}%`)
      : null;

    if (adxChart) {
      const adxValues = adxPoints.flatMap((point) => [point.plusDi, point.minusDi, point.adx])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      const adxMax = Math.max(50, adxThreshold, adxTopLevel, ...adxValues);
      const backgroundSeries = adxChart.addSeries(HistogramSeries, {
        color: "rgba(0, 128, 0, 0.45)",
        base: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 3, minMove: 0.001 },
      });
      backgroundSeries.setData(adxPoints.map((point) => {
        const plus = point.plusDi ?? 0;
        const minus = point.minusDi ?? 0;
        const adx = point.adx ?? 0;
        const bullish = plus >= minus;
        const strong = adx >= adxThreshold;
        return {
          time: point.time as UTCTimestamp,
          value: adxMax,
          color: bullish
            ? (strong ? "rgba(0, 128, 0, 0.70)" : "rgba(0, 128, 0, 0.38)")
            : (strong ? "rgba(176, 0, 0, 0.70)" : "rgba(176, 0, 0, 0.38)"),
        };
      }));

      const addAdxLine = (
        color: string,
        width: 1 | 2,
        style: LineStyle,
        data: LineData<UTCTimestamp>[],
        lastValueVisible = false,
      ) => {
        const series = adxChart.addSeries(LineSeries, {
          color,
          lineWidth: width,
          lineStyle: style,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible,
          priceFormat: { type: "price", precision: 3, minMove: 0.001 },
        });
        series.setData(data);
      };

      addAdxLine(ADX_THRESHOLD_COLOR, 1, LineStyle.Dashed, adxPoints.map((point) => ({
        time: point.time as UTCTimestamp,
        value: adxThreshold,
      })));
      addAdxLine(ADX_PLUS_COLOR, 2, LineStyle.Solid, adxLineData(adxPoints, "plusDi"), true);
      addAdxLine(ADX_MINUS_COLOR, 2, LineStyle.Solid, adxLineData(adxPoints, "minusDi"), true);
      addAdxLine(ADX_STRENGTH_COLOR, 2, LineStyle.Solid, adxLineData(adxPoints, "adx"), true);
    }

    if (adrChart && adrWindow) {
      // Bar per completed daily candle's own High-Low range, colored against
      // the average so it's visible at a glance which days pulled ADR up or
      // down - not just what the final number is.
      const rangeSeries = adrChart.addSeries(HistogramSeries, {
        base: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision, minMove: 10 ** -precision },
      });
      rangeSeries.setData(adrWindow.candles.map((candle, index) => ({
        time: candle.time as UTCTimestamp,
        value: adrWindow.ranges[index],
        color: adrWindow.ranges[index] >= adrWindow.adr ? ADR_ABOVE_AVERAGE_COLOR : ADR_BELOW_AVERAGE_COLOR,
      })));

      const addAdrLine = (
        color: string,
        style: LineStyle,
        value: number,
      ) => {
        const series = adrChart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lineStyle: style,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: true,
          priceFormat: { type: "price", precision, minMove: 10 ** -precision },
        });
        series.setData(adrWindow.candles.map((candle) => ({
          time: candle.time as UTCTimestamp,
          value,
        })));
      };

      addAdrLine(ADR_AVERAGE_LINE_COLOR, LineStyle.Solid, adrWindow.adr);
      if (adrWindow.minAdr !== null) addAdrLine(ADR_THRESHOLD_LINE_COLOR, LineStyle.Dashed, adrWindow.minAdr);
      if (adrWindow.maxAdr !== null) addAdrLine(ADR_THRESHOLD_LINE_COLOR, LineStyle.Dashed, adrWindow.maxAdr);
    }

    if (gapChart && gapWindow) {
      // One bar per qualifying gap, at its size percentage, against the
      // dashed minimum. Days with no true gap simply have no bar, so the
      // pane reads as "how often, and how big" at a glance.
      const gapSizeSeries = gapChart.addSeries(HistogramSeries, {
        base: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      gapSizeSeries.setData(gapWindow.gaps.map((gap) => ({
        time: gap.time as UTCTimestamp,
        value: gap.sizePct,
        color: gap.direction === "up" ? GAP_UP_HIGHLIGHT_COLOR : GAP_DOWN_HIGHLIGHT_COLOR,
      })));

      const thresholdSeries = gapChart.addSeries(LineSeries, {
        color: GAP_THRESHOLD_LINE_COLOR,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      thresholdSeries.setData(gapWindow.candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        value: gapWindow.minGapPct,
      })));
    }

    if (mode === "trend" && trendChannel) {
      addTrendChannelFills(chart, source, trendChannel, precision);
    }

    if (mode === "gap" && gapWindow) {
      // Shade each true empty-space gap across the two sessions that created
      // it, so the blank area itself is visible rather than merely implied.
      gapWindow.gaps.forEach((gap) => {
        const span = [gap.previousTime, gap.time]
          .filter((time): time is number => time !== null)
          .map((time) => time as UTCTimestamp);
        if (span.length < 2) return;

        addPriceBandFill(
          chart,
          span.map((time) => ({ time, value: gap.emptyTo })),
          span.map((time) => ({ time, value: gap.emptyFrom })),
          gap.direction === "up" ? GAP_UP_FILL_COLOR : GAP_DOWN_FILL_COLOR,
          precision,
        );
      });
    }

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      borderVisible: true,
      priceFormat: {
        type: "price",
        precision,
        minMove: 10 ** -precision,
      },
      priceLineVisible: true,
      priceLineColor: DOWN_COLOR,
      lastValueVisible: true,
    });
    candleSeries.setData(toCandleData(source, candleReasons));

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

    const activeRegressionChannel = mode === "lrc" ? lrcChannel : regressionChannel;
    if ((mode === "lrc" || mode === "regression") && activeRegressionChannel) {
      const lineData = (line: RegressionChannelLine): LineData<UTCTimestamp>[] => (
        source.flatMap((candle, candleIndex) => {
          const value = regressionValueAt(activeRegressionChannel, line, candleIndex, source.length);
          return value === null ? [] : [{ time: candle.time as UTCTimestamp, value }];
        })
      );
      const firstMiddle = activeRegressionChannel.middle.find((value) => value !== null);
      const lastMiddle = [...activeRegressionChannel.middle].reverse().find((value) => value !== null);
      const regressionColor = (
        firstMiddle !== undefined
        && lastMiddle !== undefined
        && lastMiddle !== firstMiddle
      ) ? (lastMiddle > firstMiddle ? "#00ff00" : "#ff0000") : "#cccccc";

      addLine("#00e676", 2, LineStyle.Solid, lineData("upper"), true);
      if (mode === "regression") addLine("#00c853", 1, LineStyle.Dashed, lineData("q3"));
      addLine(regressionColor, 2, LineStyle.Solid, lineData("middle"), true);
      if (mode === "regression") addLine("#ff5252", 1, LineStyle.Dashed, lineData("q1"));
      addLine("#ff1744", 2, LineStyle.Solid, lineData("lower"), true);
      if (mode === "regression") addLine("#ffffff", 1, LineStyle.Solid, lineData("tracer"));
    }

    if (mode === "trend" && trendChannel) {
      addLine(TREND_TOP_COLOR, 2, LineStyle.Solid, buildTrendLineData(source, trendChannel, "top"), true);
      addLine(TREND_CENTER_COLOR, 2, LineStyle.Dashed, buildTrendLineData(source, trendChannel, "middle"), true);
      addLine(TREND_BOTTOM_COLOR, 2, LineStyle.Solid, buildTrendLineData(source, trendChannel, "bottom"), true);
    }

    if (mode === "confluence") {
      const sourceLineData = (
        confluenceSource: ConfluenceChartSource,
        line: "lower" | "upper" | "mid",
      ): LineData<UTCTimestamp>[] => source.flatMap((candle, candleIndex) => {
        const value = confluenceValueAt(confluenceSource, line, candleIndex, source.length);
        return value === null ? [] : [{ time: candle.time as UTCTimestamp, value }];
      });

      confluenceSources.forEach((confluenceSource, index) => {
        const color = CONFLUENCE_SOURCE_COLORS[index] ?? CONFLUENCE_SOURCE_COLORS[0];
        if (confluenceSource.isZone) {
          addLine(color, 1, LineStyle.Dashed, sourceLineData(confluenceSource, "lower"));
          addLine(color, 1, LineStyle.Dashed, sourceLineData(confluenceSource, "upper"));
          addLine(color, 2, LineStyle.Solid, sourceLineData(confluenceSource, "mid"), true);
        } else {
          addLine(color, 2, LineStyle.Solid, sourceLineData(confluenceSource, "mid"), true);
        }
      });
    }

    if (mode === "linreg") {
      const signal = source.flatMap((candle) => (
        candle.signal === undefined
          ? []
          : [{ time: candle.time as UTCTimestamp, value: candle.signal }]
      ));
      addLine("#f8fafc", 2, LineStyle.Solid, signal, true);
    }

    // The ADX, ADR and Gap panes are mutually exclusive: the ADR and Gap
    // modes swap completed_candles out for daily bars, so an intraday ADX
    // pane underneath either would be meaningless. One shared "secondary
    // pane" wire-up covers whichever of the three is active.
    const secondaryChart = adxChart ?? adrChart ?? gapChart;

    const applyRange = () => {
      if (range === "all" || source.length <= range) {
        chart.timeScale().fitContent();
        secondaryChart?.timeScale().fitContent();
        return;
      }
      const logicalRange = {
        from: source.length - range - 0.5,
        to: source.length - 0.5 + 6,
      };
      chart.timeScale().setVisibleLogicalRange(logicalRange);
      secondaryChart?.timeScale().setVisibleLogicalRange(logicalRange);
    };
    applyRange();
    resetViewRef.current = () => {
      candleSeries.priceScale().applyOptions({ autoScale: true });
      secondaryChart?.priceScale("right").applyOptions({ autoScale: true });
      applyRange();
    };

    let syncingTimeScale = false;
    const syncVisibleTimeRange = (target: IChartApi) => (timeRange: { from: Time; to: Time } | null) => {
      if (syncingTimeScale || !timeRange) return;
      syncingTimeScale = true;
      target.timeScale().setVisibleRange(timeRange);
      syncingTimeScale = false;
    };
    const syncVisibleLogicalRange = (target: IChartApi) => (logicalRange: LogicalRange | null) => {
      if (syncingTimeScale || !logicalRange) return;
      syncingTimeScale = true;
      target.timeScale().setVisibleLogicalRange(logicalRange);
      syncingTimeScale = false;
    };
    const syncMainTimeToSecondary = secondaryChart ? syncVisibleTimeRange(secondaryChart) : null;
    const syncSecondaryTimeToMain = syncVisibleTimeRange(chart);
    const syncMainLogicalToSecondary = secondaryChart ? syncVisibleLogicalRange(secondaryChart) : null;
    const syncSecondaryLogicalToMain = syncVisibleLogicalRange(chart);
    if (secondaryChart && syncMainTimeToSecondary && syncMainLogicalToSecondary) {
      chart.timeScale().subscribeVisibleTimeRangeChange(syncMainTimeToSecondary);
      secondaryChart.timeScale().subscribeVisibleTimeRangeChange(syncSecondaryTimeToMain);
      chart.timeScale().subscribeVisibleLogicalRangeChange(syncMainLogicalToSecondary);
      secondaryChart.timeScale().subscribeVisibleLogicalRangeChange(syncSecondaryLogicalToMain);
    }

    chart.subscribeCrosshairMove((parameter) => {
      const time = parameter.time === undefined ? null : unixTime(parameter.time);
      setHoveredTime(time);

      const reasons = time === null ? undefined : candleReasons.get(time);
      if (time !== null && reasons?.length && parameter.point) {
        setCandleTooltip({ x: parameter.point.x, y: parameter.point.y, time, reasons });
      } else {
        setCandleTooltip(null);
      }
    });
    secondaryChart?.subscribeCrosshairMove((parameter) => {
      setHoveredTime(parameter.time === undefined ? null : unixTime(parameter.time));
    });

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        const nextWidth = Math.floor(width);
        chart.applyOptions({ width: nextWidth });
        secondaryChart?.applyOptions({ width: nextWidth });
      }
    });
    observer.observe(host);

    return () => {
      if (secondaryChart && syncMainTimeToSecondary && syncMainLogicalToSecondary) {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(syncMainTimeToSecondary);
        secondaryChart.timeScale().unsubscribeVisibleTimeRangeChange(syncSecondaryTimeToMain);
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(syncMainLogicalToSecondary);
        secondaryChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncSecondaryLogicalToMain);
      }
      observer.disconnect();
      resetViewRef.current = () => undefined;
      secondaryChart?.remove();
      chart.remove();
      setCandleTooltip(null);
    };
  }, [adrWindow, adxPoints, gapWindow, adxThreshold, adxTopLevel, candleReasons, confluenceSources, lrcChannel, mode, precision, range, regressionChannel, showAdrPane, showAdxPane, showGapPane, source, timeZone, timeframe, trendChannel]);

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
          {showConfluenceChart ? (
            <button
              type="button"
              onClick={() => setMode("confluence")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "confluence" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Channel Confluence
            </button>
          ) : null}
          {showLrcChart ? (
            <button
              type="button"
              onClick={() => setMode("lrc")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "lrc" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Linear Regression Channel
            </button>
          ) : null}
          {showRegressionChart ? (
            <button
              type="button"
              onClick={() => setMode("regression")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "regression" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Regression Channel [DW]
            </button>
          ) : null}
          {showTrendChart ? (
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
          {showAdrChart ? (
            <button
              type="button"
              onClick={() => setMode("adr")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "adr" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <LineChart className="h-3.5 w-3.5" />
              ADR $
            </button>
          ) : null}
          {showGapChart ? (
            <button
              type="button"
              onClick={() => setMode("gap")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${mode === "gap" ? "bg-[#2962ff] text-white" : "text-[#b2b5be] hover:bg-[#2a2e39]"}`}
            >
              <CandlestickChart className="h-3.5 w-3.5" />
              Gap Exclusion
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

      {mode === "confluence" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#20232a] bg-[#0d1014] px-3 py-2 text-[11px]">
          {confluenceSources.map((confluenceSource, index) => (
            <span
              key={confluenceSource.sourceId}
              className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1"
              style={{ color: CONFLUENCE_SOURCE_COLORS[index] }}
            >
              Source {index + 1}: {confluenceSource.channelType.toUpperCase()} · {confluenceSource.selection.replace(/_/g, " ")} · {confluenceSource.length} bars
            </span>
          ))}
        </div>
      ) : null}

      {interactionSummaries.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#20232a] bg-[#0d1014] px-3 py-2 text-[11px]">
          {interactionSummaries.map((summary) => (
            <span
              key={`${summary.action}-${summary.line}`}
              className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1 text-[#d1d4dc]"
            >
              {summary.actionLabel} · {summary.line.replace(/_/g, " ")} line
              {summary.candlesSince !== null ? ` · ${summary.candlesSince} candles ago` : ""}
              {summary.action === "reclaimed_from_below_bullish"
                ? ` · ${summary.closedBelowCount} close${summary.closedBelowCount === 1 ? "" : "s"} below first`
                : " · never closed below the line"}
            </span>
          ))}
          <span className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1 text-[#9ca3af]">
            Hover each outlined candle to step through the sequence.
          </span>
        </div>
      ) : null}

      {mode === "adr" && adrWindow ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#20232a] bg-[#0d1014] px-3 py-2 text-[11px]">
          <span className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1" style={{ color: ADR_HIGHLIGHT_COLOR }}>
            {adrWindow.lookbackDays}-day ADR: ${adrWindow.adr.toFixed(2)} ({adrThresholdLabel(adrWindow)})
          </span>
          <span className={`rounded border border-[#2a2e39] px-2 py-1 ${adrWindow.passed ? "text-[#089981]" : "text-[#f23645]"}`}>
            {adrWindow.passed ? "Passed" : "Did not pass"}
          </span>
          <span className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1 text-[#9ca3af]">
            Always calculated from completed 1-Day candles, independent of the scan&apos;s own timeframe.
          </span>
        </div>
      ) : null}

      {mode === "gap" && gapWindow ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#20232a] bg-[#0d1014] px-3 py-2 text-[11px]">
          <span className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1 text-[#d1d4dc]">
            {gapWindow.gaps.length} qualifying gap{gapWindow.gaps.length === 1 ? "" : "s"} in {gapWindow.lookbackDays} daily candles
            {" "}(min {gapWindow.minGapPct}%, max allowed {gapWindow.maxGaps})
          </span>
          <span className={`rounded border border-[#2a2e39] px-2 py-1 ${gapWindow.passed ? "text-[#089981]" : "text-[#f23645]"}`}>
            {gapWindow.passed ? "Passed" : "Excluded"}
          </span>
          <span className="rounded border border-[#2a2e39] bg-[#151922] px-2 py-1 text-[#9ca3af]">
            Only completely blank price areas count — overlapping candles, touches and long wicks do not.
          </span>
        </div>
      ) : null}

      <div className="min-h-10 border-b border-[#20232a] px-3 py-1.5 font-mono text-[11px]">
        {selected ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[#787b86]">{formatTime(selected.time, timeZone)}</span>
            <span>O <b className="font-normal text-white">{formatPrice(selected.open, precision)}</b></span>
            <span>H <b className="font-normal text-white">{formatPrice(selected.high, precision)}</b></span>
            <span>L <b className="font-normal text-white">{formatPrice(selected.low, precision)}</b></span>
            <span>C <b className={selected.close >= selected.open ? "font-normal text-[#089981]" : "font-normal text-[#f23645]"}>{formatPrice(selected.close, precision)}</b></span>
            {selected.volume != null ? <span>Vol <b className="font-normal text-white">{compactVolume(selected.volume)}</b></span> : null}
            {selectedAdrRange != null && adrWindow ? (
              <span style={{ color: selectedAdrRange >= adrWindow.adr ? ADR_ABOVE_AVERAGE_COLOR : ADR_BELOW_AVERAGE_COLOR }}>
                Range {formatPrice(selectedAdrRange, precision)} (avg {formatPrice(adrWindow.adr, precision)})
              </span>
            ) : null}
            {selectedGap ? (
              <span style={{ color: selectedGap.direction === "up" ? GAP_UP_HIGHLIGHT_COLOR : GAP_DOWN_HIGHLIGHT_COLOR }}>
                True gap {selectedGap.direction} {selectedGap.sizePct.toFixed(2)}%
                {" "}[{formatPrice(selectedGap.emptyFrom, precision)}–{formatPrice(selectedGap.emptyTo, precision)}]
              </span>
            ) : null}
            {selectedRegression?.upper != null ? <span className="text-[#00e676]">Upper {formatPrice(selectedRegression.upper, precision)}</span> : null}
            {selectedRegression?.q3 != null ? <span className="text-[#00c853]">Q3 {formatPrice(selectedRegression.q3, precision)}</span> : null}
            {selectedRegression?.middle != null ? <span className="text-[#d1d4dc]">Middle {formatPrice(selectedRegression.middle, precision)}</span> : null}
            {selectedRegression?.q1 != null ? <span className="text-[#ff5252]">Q1 {formatPrice(selectedRegression.q1, precision)}</span> : null}
            {selectedRegression?.lower != null ? <span className="text-[#ff1744]">Lower {formatPrice(selectedRegression.lower, precision)}</span> : null}
            {selectedRegression?.tracer != null ? <span className="text-white">Tracer {formatPrice(selectedRegression.tracer, precision)}</span> : null}
            {selectedTrend?.top != null ? <span style={{ color: TREND_TOP_COLOR }}>Top {formatPrice(selectedTrend.top, precision)}</span> : null}
            {selectedTrend?.topZoneLower != null ? <span style={{ color: TREND_TOP_COLOR }}>Top Zone {formatPrice(selectedTrend.topZoneLower, precision)}</span> : null}
            {selectedTrend?.middle != null ? <span style={{ color: TREND_CENTER_COLOR }}>Middle {formatPrice(selectedTrend.middle, precision)}</span> : null}
            {selectedTrend?.bottomZoneUpper != null ? <span style={{ color: TREND_BOTTOM_COLOR }}>Bottom Zone {formatPrice(selectedTrend.bottomZoneUpper, precision)}</span> : null}
            {selectedTrend?.bottom != null ? <span style={{ color: TREND_BOTTOM_COLOR }}>Bottom {formatPrice(selectedTrend.bottom, precision)}</span> : null}
            {selectedConfluence.map(({ source: confluenceSource, lower, mid, upper }, index) => {
              const value = mid ?? lower ?? upper;
              if (value == null) return null;
              return (
                <span key={confluenceSource.sourceId} style={{ color: CONFLUENCE_SOURCE_COLORS[index] }}>
                  S{index + 1} {confluenceSource.selection.replace(/_/g, " ")} {formatPrice(value, precision)}
                  {confluenceSource.isZone && lower !== null && upper !== null
                    ? ` [${formatPrice(lower, precision)}–${formatPrice(upper, precision)}]`
                    : ""}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <div
          ref={chartHostRef}
          data-testid="trading-chart-canvas"
          className="h-[560px] w-full bg-[#0b0e11]"
        />

        {candleTooltip ? (
          <div
            className="pointer-events-none absolute z-20 max-w-xs rounded-md border border-[#2a2e39] bg-[#151922]/95 px-3 py-2 text-[11px] shadow-xl"
            style={{
              left: Math.min(candleTooltip.x + 14, Math.max(0, (chartHostRef.current?.clientWidth ?? 0) - 260)),
              top: Math.max(0, candleTooltip.y - 8),
            }}
          >
            <div className="mb-1 text-[10px] text-[#787b86]">{formatTime(candleTooltip.time, timeZone)}</div>
            <div className="space-y-1.5">
              {candleTooltip.reasons.map((reason, index) => (
                <div key={`${reason.label}-${index}`} className="flex items-start gap-1.5">
                  <span
                    className="mt-0.5 h-2.5 w-2.5 flex-none rounded-sm border-2"
                    style={{ borderColor: reason.color }}
                  />
                  <div>
                    <div className="font-semibold text-white">{reason.label}</div>
                    <div className="text-[#b2b5be]">{reason.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {showAdxPane ? (
        <div className="relative border-t border-[#2a2e39] bg-[#0b0e11]">
          <div
            ref={adxChartHostRef}
            data-testid="trendy-adx-chart-canvas"
            className="h-[170px] w-full bg-[#0b0e11]"
          />
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 font-mono text-sm font-semibold text-[#d1d4dc]">
            <span>Trendy ADX</span>
            {selectedAdx?.adx != null ? <span style={{ color: ADX_STRENGTH_COLOR }}>{selectedAdx.adx.toFixed(3)}</span> : null}
            {selectedAdx?.minusDi != null ? <span style={{ color: ADX_MINUS_COLOR }}>{selectedAdx.minusDi.toFixed(3)}</span> : null}
            {selectedAdx?.plusDi != null ? <span style={{ color: ADX_PLUS_COLOR }}>{selectedAdx.plusDi.toFixed(3)}</span> : null}
          </div>
        </div>
      ) : null}

      {showAdrPane && adrWindow ? (
        <div className="relative border-t border-[#2a2e39] bg-[#0b0e11]">
          <div
            ref={adrChartHostRef}
            data-testid="adr-chart-canvas"
            className="h-[170px] w-full bg-[#0b0e11]"
          />
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 font-mono text-sm font-semibold text-[#d1d4dc]">
            <span>Daily Range</span>
            <span style={{ color: ADR_HIGHLIGHT_COLOR }}>avg {formatPrice(adrWindow.adr, precision)}</span>
          </div>
        </div>
      ) : null}

      {showGapPane && gapWindow ? (
        <div className="relative border-t border-[#2a2e39] bg-[#0b0e11]">
          <div
            ref={gapChartHostRef}
            data-testid="gap-chart-canvas"
            className="h-[170px] w-full bg-[#0b0e11]"
          />
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 font-mono text-sm font-semibold text-[#d1d4dc]">
            <span>Gap Size</span>
            <span style={{ color: GAP_THRESHOLD_LINE_COLOR }}>min {gapWindow.minGapPct}%</span>
            {selectedGap ? (
              <span style={{ color: selectedGap.direction === "up" ? GAP_UP_HIGHLIGHT_COLOR : GAP_DOWN_HIGHLIGHT_COLOR }}>
                {selectedGap.sizePct.toFixed(2)}%
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2e39] px-3 py-2 text-[10px] text-[#787b86]">
        <span>
          Drag chart to pan · wheel/pinch to zoom · drag either axis to rescale · double-click an axis to reset · hover an outlined candle for why it matched
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {mode === "confluence" && candleReasons.size ? (
            <>
              {confluenceSources.map((confluenceSource, index) => (
                <span key={confluenceSource.sourceId} className="flex items-center gap-1.5 text-[#9ca3af]">
                  <span
                    className="h-2.5 w-2.5 border-2"
                    style={{ borderColor: CONFLUENCE_SOURCE_COLORS[index] ?? CONFLUENCE_SOURCE_COLORS[0] }}
                  />
                  Source {index + 1} match
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: LIQUIDITY_SWEEP_HIGHLIGHT_COLOR }} />
                Liquidity sweep
              </span>
            </>
          ) : null}
          {mode === "adr" && candleReasons.size ? (
            <>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: ADR_ABOVE_AVERAGE_COLOR }} />
                Day at/above average
              </span>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: ADR_BELOW_AVERAGE_COLOR }} />
                Day below average
              </span>
            </>
          ) : null}
          {mode === "gap" && candleReasons.size ? (
            <>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: GAP_UP_HIGHLIGHT_COLOR }} />
                True gap up
              </span>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: GAP_DOWN_HIGHLIGHT_COLOR }} />
                True gap down
              </span>
            </>
          ) : null}
          {interactionSummaries.length && candleReasons.size ? (
            <>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: INTERACTION_BELOW_COLOR }} />
                Closed below line
              </span>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: INTERACTION_EVENT_COLOR }} />
                Reclaim / rejection candle
              </span>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: INTERACTION_CONTEXT_COLOR }} />
                Prior candle
              </span>
              <span className="flex items-center gap-1.5 text-[#9ca3af]">
                <span className="h-2.5 w-2.5 border-2" style={{ borderColor: INTERACTION_STILL_ABOVE_COLOR }} />
                Still above now
              </span>
            </>
          ) : null}
          {!interactionSummaries.length && mode !== "confluence" && mode !== "adr" && mode !== "gap" && candleReasons.size ? (
            <span className="flex items-center gap-1.5 text-[#9ca3af]">
              <span className="h-2.5 w-2.5 border-2" style={{ borderColor: CHANNEL_RESPECT_HIGHLIGHT_COLOR }} />
              Channel Respect match
            </span>
          ) : null}
          <span>{timeZone} · {mode === "adr" || mode === "gap" ? "completed daily bars" : "completed bars only"} · {source.length} bars</span>
        </div>
      </div>
    </div>
  );
}
