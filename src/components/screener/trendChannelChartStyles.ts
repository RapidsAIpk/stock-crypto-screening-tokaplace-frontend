import { AreaSeries, type IChartApi, type LineData, type UTCTimestamp } from "lightweight-charts";
import {
  trendValueAt,
  type ChartCandle,
  type TrendChannelLine,
  type TrendChannelSeries,
} from "./resultDetailChartData";

export const TV_BACKGROUND = "#0b0e11";

// ChartPrime Trend Channels [ChartPrime] defaults from Pine source.
export const TREND_TOP_COLOR = "rgb(51, 124, 79)";
export const TREND_BOTTOM_COLOR = "rgb(165, 45, 45)";
export const TREND_CENTER_COLOR = "#787b86";

export const TREND_TOP_FILL_DARK = "rgba(51, 124, 79, 0.80)";
export const TREND_TOP_FILL_LIGHT = "rgba(51, 124, 79, 0.20)";
export const TREND_BOTTOM_FILL_LIGHT = "rgba(165, 45, 45, 0.20)";
export const TREND_BOTTOM_FILL_DARK = "rgba(165, 45, 45, 0.80)";

interface BandData {
  upper: LineData<UTCTimestamp>[];
  lower: LineData<UTCTimestamp>[];
}

function trendLineValue(
  channel: TrendChannelSeries,
  line: TrendChannelLine,
  candleIndex: number,
  candleCount: number,
): number | null {
  return trendValueAt(channel, line, candleIndex, candleCount);
}

function buildInterpolatedBandData(
  source: ChartCandle[],
  channel: TrendChannelSeries,
  upperLine: TrendChannelLine,
  lowerLine: TrendChannelLine,
): BandData {
  const upper: LineData<UTCTimestamp>[] = [];
  const lower: LineData<UTCTimestamp>[] = [];

  source.forEach((candle, candleIndex) => {
    const upperValue = trendLineValue(channel, upperLine, candleIndex, source.length);
    const lowerValue = trendLineValue(channel, lowerLine, candleIndex, source.length);
    if (upperValue === null || lowerValue === null) return;

    const time = candle.time as UTCTimestamp;
    const high = Math.max(upperValue, lowerValue);
    const low = Math.min(upperValue, lowerValue);
    const midpoint = (high + low) / 2;

    upper.push({ time, value: high });
    lower.push({ time, value: midpoint });
  });

  return { upper, lower };
}

function buildInterpolatedBandDataFromMidpoint(
  source: ChartCandle[],
  channel: TrendChannelSeries,
  upperLine: TrendChannelLine,
  lowerLine: TrendChannelLine,
): BandData {
  const upper: LineData<UTCTimestamp>[] = [];
  const lower: LineData<UTCTimestamp>[] = [];

  source.forEach((candle, candleIndex) => {
    const upperValue = trendLineValue(channel, upperLine, candleIndex, source.length);
    const lowerValue = trendLineValue(channel, lowerLine, candleIndex, source.length);
    if (upperValue === null || lowerValue === null) return;

    const time = candle.time as UTCTimestamp;
    const high = Math.max(upperValue, lowerValue);
    const low = Math.min(upperValue, lowerValue);
    const midpoint = (high + low) / 2;

    upper.push({ time, value: midpoint });
    lower.push({ time, value: low });
  });

  return { upper, lower };
}

function buildExactBandData(
  source: ChartCandle[],
  channel: TrendChannelSeries,
  upperLine: TrendChannelLine,
  lowerLine: TrendChannelLine,
): BandData {
  const upper: LineData<UTCTimestamp>[] = [];
  const lower: LineData<UTCTimestamp>[] = [];

  source.forEach((candle, candleIndex) => {
    const upperValue = trendLineValue(channel, upperLine, candleIndex, source.length);
    const lowerValue = trendLineValue(channel, lowerLine, candleIndex, source.length);
    if (upperValue === null || lowerValue === null) return;

    const time = candle.time as UTCTimestamp;
    upper.push({ time, value: Math.max(upperValue, lowerValue) });
    lower.push({ time, value: Math.min(upperValue, lowerValue) });
  });

  return { upper, lower };
}

function addBandFill(
  chart: IChartApi,
  band: BandData,
  fillColor: string,
  precision: number,
) {
  if (!band.upper.length || !band.lower.length) return;

  const priceFormat = {
    type: "price" as const,
    precision,
    minMove: 10 ** -precision,
  };

  const fillSeries = chart.addSeries(AreaSeries, {
    topColor: fillColor,
    bottomColor: fillColor,
    lineColor: "transparent",
    lineVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat,
  });
  fillSeries.setData(band.upper);

  const maskSeries = chart.addSeries(AreaSeries, {
    topColor: TV_BACKGROUND,
    bottomColor: TV_BACKGROUND,
    lineColor: "transparent",
    lineVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat,
  });
  maskSeries.setData(band.lower);
}

export function addTrendChannelFills(
  chart: IChartApi,
  source: ChartCandle[],
  channel: TrendChannelSeries,
  precision: number,
) {
  const topInner = channel.top_zone_lower.some((value) => value !== null)
    ? "top_zone_lower"
    : "middle";
  const bottomInner = channel.bottom_zone_upper.some((value) => value !== null)
    ? "bottom_zone_upper"
    : "middle";
  const hasExactZoneMidlines = (
    channel.top_zone_mid.some((value) => value !== null)
    && channel.bottom_zone_mid.some((value) => value !== null)
  );

  const bands = hasExactZoneMidlines
    ? [
        {
          data: buildExactBandData(source, channel, "top", "top_zone_mid"),
          color: TREND_TOP_FILL_DARK,
        },
        {
          data: buildExactBandData(source, channel, "top_zone_mid", topInner),
          color: TREND_TOP_FILL_LIGHT,
        },
        {
          data: buildExactBandData(source, channel, bottomInner, "bottom_zone_mid"),
          color: TREND_BOTTOM_FILL_LIGHT,
        },
        {
          data: buildExactBandData(source, channel, "bottom_zone_mid", "bottom"),
          color: TREND_BOTTOM_FILL_DARK,
        },
      ]
    : [
        {
          data: buildInterpolatedBandData(source, channel, "top", topInner),
          color: TREND_TOP_FILL_DARK,
        },
        {
          data: buildInterpolatedBandDataFromMidpoint(source, channel, "top", topInner),
          color: TREND_TOP_FILL_LIGHT,
        },
        {
          data: buildInterpolatedBandData(source, channel, "bottom", bottomInner),
          color: TREND_BOTTOM_FILL_LIGHT,
        },
        {
          data: buildInterpolatedBandDataFromMidpoint(source, channel, "bottom", bottomInner),
          color: TREND_BOTTOM_FILL_DARK,
        },
      ];

  for (const band of bands) {
    addBandFill(chart, band.data, band.color, precision);
  }
}

export function buildTrendLineData(
  source: ChartCandle[],
  channel: TrendChannelSeries,
  line: TrendChannelLine,
): LineData<UTCTimestamp>[] {
  return source.flatMap((candle, candleIndex) => {
    const value = trendLineValue(channel, line, candleIndex, source.length);
    return value === null ? [] : [{ time: candle.time as UTCTimestamp, value }];
  });
}
