export type AssetType = "stocks" | "crypto";
export type ScanStage = "single" | "gate" | "entry";

export type TimeframeMode = "single" | "gate_entry";

export type ComplianceStatus =
  | "compliant"
  | "non-compliant"
  | "questionable";

export type IndicatorTimeframe = "single" | "primary" | "secondary";

export type IndicatorName =
  | "rsi"
  | "wavetrend"
  | "aroon"
  | "adx"
  | "vlr"
  | "lrc"
  | "regression"
  | "trend"
  | "linreg_candles"
  | "ema"
  | "macd"
  | "volume"
  | "relative_volume"
  | "current_volume"
  | "float"
  | "shares_outstanding"
  | "volatility";

export type ChannelType = "lrc" | "regression" | "trend";
export type ChannelLine =
  | "upper"
  | "middle"
  | "lower"
  | "both"
  | "upper_middle"
  | "lower_middle"
  | "all";
export type ConfluenceSelection =
  | "upper"
  | "middle"
  | "lower"
  | "top_line"
  | "middle_line"
  | "bottom_line"
  | "top_zone"
  | "bottom_zone";

export interface IndicatorConfig {
  name: IndicatorName;
  timeframe: IndicatorTimeframe;
  config: Record<string, unknown>;
}

export type EmaSelectionMode = "any" | "all" | "one" | "multiple";

export type EmaConditionName =
  | "touch_from_above"
  | "piercing_from_below"
  | "close_above"
  | "touched_or_pierced_and_closed_above";

export interface EmaConditionConfig {
  enabled: boolean;
  candles_since_min: number;
  candles_since_max: number;
  require_still_above_now?: boolean;
}

export type EmaConditionsConfig = Record<EmaConditionName, EmaConditionConfig>;

export interface EmaConfig {
  periods: number[];
  selection_mode: EmaSelectionMode;
  conditions: EmaConditionsConfig;
}

export const EMA_COMMON_PERIODS = [9, 20, 50, 100, 200] as const;

export const EMA_SELECTION_MODES: Array<{ value: EmaSelectionMode; label: string }> = [
  { value: "any", label: "Any" },
  { value: "all", label: "All" },
  { value: "one", label: "One" },
  { value: "multiple", label: "Multiple" },
];

export const EMA_CONDITION_LABELS: Record<EmaConditionName, string> = {
  touch_from_above: "Touch From Above",
  piercing_from_below: "Piercing From Below",
  close_above: "Close Above",
  touched_or_pierced_and_closed_above: "Touched/Pierced + Closed Above",
};

export const EMA_CONDITION_HELP: Record<EmaConditionName, string> = {
  touch_from_above: "Previous close was above EMA, the candle touched the EMA, and the close stayed above.",
  piercing_from_below: "Previous close was below EMA, the candle crossed through EMA, and the close finished above.",
  close_above: "The selected candle close is above the EMA.",
  touched_or_pierced_and_closed_above: "A touch or piercing event occurred in range, and the latest completed close is above EMA.",
};

export const DEFAULT_EMA_CONDITIONS: EmaConditionsConfig = {
  touch_from_above: {
    enabled: true,
    candles_since_min: 0,
    candles_since_max: 5,
  },
  piercing_from_below: {
    enabled: false,
    candles_since_min: 0,
    candles_since_max: 5,
  },
  close_above: {
    enabled: true,
    candles_since_min: 0,
    candles_since_max: 0,
  },
  touched_or_pierced_and_closed_above: {
    enabled: false,
    candles_since_min: 0,
    candles_since_max: 5,
    require_still_above_now: true,
  },
};

export const DEFAULT_EMA_CONFIG: EmaConfig = {
  periods: [9],
  selection_mode: "any",
  conditions: DEFAULT_EMA_CONDITIONS,
};

export interface AreaRule {
  area: string;
  action: string;
  window: number | null;
  tolerance?: number | null;
  candles_since_min?: number | null;
  candles_since_max?: number | null;
  min_consecutive_below?: number | null;
  below_candles_min?: number | null;
  below_candles_max?: number | null;
  require_still_above_now?: boolean;
  touch_type?: string | null;
  breach_type?: string | null;
  breach_direction?: string | null;
  confirmation?: boolean;
  confirmation_type?: string | null;
  confirmation_types?: string[] | null;
  confirmation_patterns?: string[] | null;
  confirmation_window?: number | null;
}

export interface ChannelRespect {
  channel_type: ChannelType;
  line: ChannelLine;
  min_respect?: number | null;
  max_respect?: number | null;
  tolerance_pct: number;
  cluster_gap: number;
  touch_type?: "wick" | "body" | "both";
}

export type ConfluenceLineRelation = "close_above" | "close_below" | "none";

export interface ConfluenceSource {
  id: string;
  channel_type: ChannelType;
  selection?: ConfluenceSelection;
  length: number;
  width_coeff?: number | null;
  upper_dev?: number | null;
  lower_dev?: number | null;
  window_type?: "continuous" | "interval" | null;
  interval_step?: number | null;
  // Optional sub-filter: require price to close above/below a specific
  // line of this source (which may differ from `selection`).
  line_relation?: ConfluenceLineRelation | null;
  target_line?: ConfluenceSelection | null;
  candles_since_close_min?: number | null;
  candles_since_close_max?: number | null;
}

export interface Confluence {
  type: "bullish" | "bearish" | "role_reversal" | "breakout" | "any";
  channels?: ChannelType[];
  sources?: ConfluenceSource[];
  liquidity_sweep: boolean;
  lookback_candles: number;
  tolerance_pct: number;
  // Client issue #4: require price to have closed back near the first
  // source's line after it breaks and the second source holds support.
  reclose_to_first_line?: boolean;
}

export interface PriceRange {
  min_price?: number | null;
  max_price?: number | null;
}

export type DeadTrendType =
  | "strong_dead_trend"
  | "slow_bleeding_trend"
  | "failed_recovery"
  | "flat_dead_asset";

export type DeadAssetsTrendSource = "ema_50" | "ema_100" | "ema_200" | "linear_regression";

export type DeadAssetsVolumeOption = "low" | "declining" | "either";

export type DeadAssetsVolatilityOption = "low_atr" | "very_low_atr" | "either";

export type DeadAssetsRecoveryOverride =
  | "disabled"
  | "wick_above_swing_high"
  | "close_above_swing_high"
  | "two_closes_above_swing_high";

export const ALL_DEAD_TREND_TYPES: DeadTrendType[] = [
  "strong_dead_trend",
  "slow_bleeding_trend",
  "failed_recovery",
  "flat_dead_asset",
];

export interface DeadAssetsFilter {
  enabled: boolean;
  dead_trend_types: DeadTrendType[];
  lower_highs_required: number;
  lower_lows_required: number;
  trend_source: DeadAssetsTrendSource;
  recovery_lookback: number;
  volume_option: DeadAssetsVolumeOption;
  volatility_option: DeadAssetsVolatilityOption;
  bounce_threshold_pct: number;
  failure_window: number;
  recovery_override: DeadAssetsRecoveryOverride;
}

export const DEFAULT_DEAD_ASSETS_FILTER: DeadAssetsFilter = {
  enabled: true,
  dead_trend_types: [...ALL_DEAD_TREND_TYPES],
  lower_highs_required: 3,
  lower_lows_required: 3,
  trend_source: "ema_200",
  recovery_lookback: 200,
  volume_option: "either",
  volatility_option: "either",
  bounce_threshold_pct: 20,
  failure_window: 20,
  recovery_override: "close_above_swing_high",
};

export interface ScreenerRequest {
  asset_type: AssetType;
  stock_sources: string[] | null;
  compliance_status: ComplianceStatus | null;
  compliance_standards: string[] | null;
  asset_categories: string[] | null;
  sectors: string[] | null;
  exchanges: string[] | null;
  excluded_categories: string[] | null;
  timeframe_mode: TimeframeMode;
  single_timeframe: string | null;
  gate_timeframe: string | null;
  entry_timeframe: string | null;
  gate_session_id?: string | null;
  indicators: IndicatorConfig[];
  channel_respect: ChannelRespect | null;
  confluence: Confluence | null;
  price_range: PriceRange | null;
  dead_assets: DeadAssetsFilter | null;
}

export interface ScreenerResult {
  symbol: string;
  price: number;
  asset_type: AssetType;
  data_source: string;
  scan_stage?: ScanStage | null;
  name?: string | null;
  category?: string | null;
  sector?: string | null;
  asset_categories?: string[] | null;
  cmc_id?: number | null;
  rank?: number | null;
  compliance_status?: string | null;
  compliance_standard?: string | null;
  report_date?: string | null;
  purification_ratio?: number | null;
  candles_count?: number | null;
  last_candle_time?: number | null;
  exchange?: string | null;
  exchange_availability?: string[] | null;
  timeframe: string;
  note?: string | null;
  stickers: string[];
  matched_indicators?: string[] | null;
}

export interface IndicatorDetail {
  name: string;
  timeframe_scope?: string | null;
  passed: boolean;
  sticker?: string | null;
  config: Record<string, unknown>;
  evidence?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export interface FilterDetail {
  name: string;
  passed: boolean;
  summary?: string | null;
  sticker?: string | null;
  details: Record<string, unknown>;
}

export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  vwap?: number | null;
  transactions?: number | null;
  is_closed?: boolean;
}

export interface MarketDataDetail {
  candles_provider?: string | null;
  next_refresh_at?: number | null;
  shares_outstanding?: number | null;
  float_shares?: number | null;
  last_candle?: MarketCandle | Record<string, unknown> | null;
  recent_candles: Array<MarketCandle | Record<string, unknown>>;
}

export interface ScreenerResultDetail extends ScreenerResult {
  asset_metadata: Record<string, unknown>;
  request_filters: Record<string, unknown>;
  indicator_details: IndicatorDetail[];
  filter_details: FilterDetail[];
  market_data: MarketDataDetail;
  channels: Record<string, unknown>;
  confluence_channels: Record<string, unknown>;
}

export interface ScreenerDetailRequest {
  symbol: string;
  asset_type: AssetType;
  timeframe: string;
  scan_stage: ScanStage;
  request: ScreenerRequest;
}

export interface ScreenerDetailResponse {
  detail: ScreenerResultDetail | null;
}

export interface ScreenerResultExportEntry {
  summary: ScreenerResult;
  detail: ScreenerResultDetail | null;
  error: string | null;
}

export interface ScreenerResultsBulkExport {
  exported_at: string;
  scan_context: {
    stage: ScanStage;
    timeframe: string;
    request: ScreenerRequest;
  };
  result_count: number;
  loaded_count: number;
  failed_count: number;
  results: ScreenerResultExportEntry[];
}

export interface CryptoExchangeOption {
  exchange: string;
  coin_count: number;
}

export interface CryptoExchangeOptionsResponse {
  exchanges: CryptoExchangeOption[];
}

export interface StockFilterOption {
  id: string;
  label: string;
}

export interface StockFilterOptionsResponse {
  asset_categories: StockFilterOption[];
  sectors: string[];
}

export const STOCK_ASSET_CATEGORIES: StockFilterOption[] = [
  { id: "nasdaq", label: "NASDAQ" },
  { id: "nyse", label: "NYSE" },
  { id: "amex", label: "AMEX" },
  { id: "etf", label: "ETF" },
  { id: "sp500", label: "S&P 500" },
  { id: "dow_jones", label: "Dow Jones" },
  { id: "russell_2000", label: "Russell 2000" },
];

export const STOCK_SECTORS = [
  "Technology",
  "Healthcare",
  "Financials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Communication Services",
  "Basic Materials",
  "Other",
] as const;

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1day"];

export const EXCLUDED_CATEGORIES = [
  { label: "Memecoins", value: "meme" },
  { label: "Gambling", value: "gambling" },
  { label: "Interest", value: "interest" },
  { label: "Adult", value: "adult" },
  { label: "Scam", value: "scam" },
];

export type IndicatorCategory =
  | "momentum"
  | "trend"
  | "volume"
  | "channel"
  | "confluence";

export const INDICATOR_CATEGORY_COLORS = {
  momentum: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  trend: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  volume: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
  },
  channel: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  confluence: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
} satisfies Record<
  IndicatorCategory,
  { bg: string; text: string; border: string }
>;

export const INDICATOR_CATEGORY_MAP: Record<IndicatorName, IndicatorCategory> = {
  rsi: "momentum",
  wavetrend: "momentum",
  aroon: "trend",
  adx: "trend",
  vlr: "trend",
  lrc: "channel",
  regression: "channel",
  trend: "channel",
  linreg_candles: "trend",
  ema: "trend",
  macd: "momentum",
  volume: "volume",
  relative_volume: "volume",
  current_volume: "volume",
  float: "volume",
  shares_outstanding: "volume",
  volatility: "trend",
};

export type IndicatorFieldType =
  | "number"
  | "text"
  | "select"
  | "multi-select"
  | "boolean"
  | "area-list"
  | "condition-list";

export interface IndicatorFieldDefinition {
  key: string;
  label: string;
  type: IndicatorFieldType;
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  section?: string;
}

export interface IndicatorDefinition {
  name: IndicatorName;
  fields: IndicatorFieldDefinition[];
}

const COMMON_DIRECTIONS = [
  "rising",
  "falling",
  "turning_up",
  "turning_down",
] as const;

const RSI_DIRECTIONS = [
  "turning_up",
  "turning_down",
] as const;

const LRC_R_FILTER_OPTIONS = [
  "ignore",
  "strong",
  "balanced",
] as const;

export const CONFIRMATION_TYPES = [
  "bullish",
  "bearish",
  "strong_bullish",
  "strong_bearish",
] as const;

export type ConfirmationType = typeof CONFIRMATION_TYPES[number];

export const BULLISH_CONFIRMATION_PATTERNS = [
  "bullish_engulfing",
  "hammer",
  "morning_star",
  "piercing_line",
  "three_white_soldiers",
  "bullish_marubozu",
  "strong_breakout_candle",
  "tweezer_bottom",
  "bullish_pin_bar",
  "double_bottom",
] as const;

export const BEARISH_CONFIRMATION_PATTERNS = [
  "bearish_engulfing",
  "shooting_star",
  "evening_star",
  "dark_cloud_cover",
  "three_black_crows",
  "bearish_marubozu",
  "strong_breakdown_candle",
  "tweezer_top",
  "bearish_pin_bar",
  "double_top",
] as const;

export const CONFIRMATION_PATTERNS = [
  ...BULLISH_CONFIRMATION_PATTERNS,
  ...BEARISH_CONFIRMATION_PATTERNS,
] as const;

export type ConfirmationPattern = typeof CONFIRMATION_PATTERNS[number];

export function isBullishConfirmationType(type: string): boolean {
  return type === "bullish" || type === "strong_bullish";
}

export function isBearishConfirmationType(type: string): boolean {
  return type === "bearish" || type === "strong_bearish";
}

export function collectConfirmationTypes(config: Record<string, unknown>): string[] {
  const types = [...((config.confirmation_types as string[] | null | undefined) ?? [])];
  const singleType = config.confirmation_type;
  if (typeof singleType === "string" && singleType.length > 0 && !types.includes(singleType)) {
    types.unshift(singleType);
  }
  return types;
}

export function allowedConfirmationPatternsForTypes(
  types: string[],
): readonly ConfirmationPattern[] {
  if (types.length === 0) {
    return CONFIRMATION_PATTERNS;
  }

  const bullish = types.some(isBullishConfirmationType);
  const bearish = types.some(isBearishConfirmationType);

  if (bullish && bearish) {
    return CONFIRMATION_PATTERNS;
  }
  if (bullish) {
    return BULLISH_CONFIRMATION_PATTERNS;
  }
  if (bearish) {
    return BEARISH_CONFIRMATION_PATTERNS;
  }

  return CONFIRMATION_PATTERNS;
}

export function filterConfirmationPatternsForTypes(
  types: string[],
  patterns: string[] | null | undefined,
): string[] {
  const allowed = new Set<string>(allowedConfirmationPatternsForTypes(types));
  return (patterns ?? []).filter((pattern) => allowed.has(pattern));
}

export function vlrAllowedCandlePatterns(direction: string): readonly string[] {
  const token = String(direction || "both").trim().toLowerCase();
  if (token === "bullish") {
    return ["bullish_engulfing", "hammer", "morning_star"];
  }
  if (token === "bearish") {
    return ["bearish_engulfing", "shooting_star", "evening_star"];
  }
  return VLR_CANDLE_PATTERNS;
}

export function filterVlrCandlePatternsForDirection(
  direction: string,
  patterns: string[] | null | undefined,
): string[] {
  const allowed = new Set<string>(vlrAllowedCandlePatterns(direction));
  return (patterns ?? []).filter((pattern) => allowed.has(pattern));
}

export function normalizeConfirmationConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };

  if (Array.isArray(next.areas)) {
    next.areas = next.areas.map((area) => (
      typeof area === "object" && area !== null
        ? normalizeConfirmationConfig(area as Record<string, unknown>)
        : area
    ));
  }

  if (next.candle_confirmation) {
    next.candle_confirmation_patterns = filterVlrCandlePatternsForDirection(
      String(next.direction ?? "both"),
      next.candle_confirmation_patterns as string[] | null | undefined,
    );
  }

  if (!next.confirmation) {
    return next;
  }

  const types = collectConfirmationTypes(next);
  next.confirmation_patterns = filterConfirmationPatternsForTypes(
    types,
    next.confirmation_patterns as string[] | null | undefined,
  );
  return next;
}

const TOUCH_TYPES = [
  "wick",
  "body",
  "both",
] as const;

const BREACH_DIRECTIONS = [
  "any",
  "up",
  "down",
] as const;

export const TREND_CHANNEL_DISABLED = "disabled" as const;

export const TREND_CHANNEL_AREAS = [
  TREND_CHANNEL_DISABLED,
  "top_line",
  "middle_line",
  "bottom_line",
  "top_zone",
  "bottom_zone",
] as const;

export function isTrendAreaRuleDisabled(area?: Partial<AreaRule> | null): boolean {
  const areaName = String(area?.area || "").trim().toLowerCase();
  const action = String(area?.action || "").trim().toLowerCase();
  return areaName === TREND_CHANNEL_DISABLED || action === TREND_CHANNEL_DISABLED;
}

export const TREND_CHANNEL_LINE_ACTIONS = [
  TREND_CHANNEL_DISABLED,
  "touched",
  "closed_above",
  "closed_below",
  "on_line",
  "breach",
  "piercing_from_below",
  "reclaimed_from_below_bullish",
  "rejected_from_above_bullish",
  "rejected_from_below_bearish",
] as const;

export const TREND_CHANNEL_ZONE_ACTIONS = [
  TREND_CHANNEL_DISABLED,
  "entered",
  "rejected",
  "breach",
  "piercing_from_below",
  "reclaimed_from_below_bullish",
  "rejected_from_above_bullish",
  "rejected_from_below_bearish",
] as const;

export const CHANNEL_SELECTION_MODES = ["any", "all", "one", "multiple"] as const;

export type ChannelSelectionMode = (typeof CHANNEL_SELECTION_MODES)[number];

export const CHANNEL_PHASE2_ACTIONS = [
  "piercing_from_below",
  "reclaimed_from_below_bullish",
  "rejected_from_above_bullish",
  "rejected_from_below_bearish",
] as const;

export type ChannelPhase2Action = (typeof CHANNEL_PHASE2_ACTIONS)[number];

export function isPhase2ChannelAction(action: unknown): boolean {
  return CHANNEL_PHASE2_ACTIONS.includes(
    String(action ?? "").trim().toLowerCase() as ChannelPhase2Action,
  );
}

export function isReclaimChannelAction(action: unknown): boolean {
  return String(action ?? "").trim().toLowerCase() === "reclaimed_from_below_bullish";
}

export const DEFAULT_TREND_AREA_RULE: AreaRule = {
  area: "top_line",
  action: "touched",
  window: 1,
  tolerance: null,
  touch_type: "wick",
  breach_type: "wick",
  breach_direction: "any",
  confirmation: false,
  confirmation_type: null,
  confirmation_types: [],
  confirmation_patterns: [],
  confirmation_window: null,
};

export const CHANNEL_LINE_TOUCH_ACTION = "touch" as const;

export const CHANNEL_LINE_CLOSE_ACTIONS = [
  "close_above",
  "close_below",
  "stay_above",
  "stay_below",
] as const;

export const CHANNEL_LINE_ACTIONS = [
  CHANNEL_LINE_TOUCH_ACTION,
  ...CHANNEL_LINE_CLOSE_ACTIONS,
  ...CHANNEL_PHASE2_ACTIONS,
] as const;

export type ChannelLineCloseAction = (typeof CHANNEL_LINE_CLOSE_ACTIONS)[number];

export function isChannelLineTouchAction(action: unknown): boolean {
  return String(action ?? CHANNEL_LINE_TOUCH_ACTION).trim().toLowerCase() === CHANNEL_LINE_TOUCH_ACTION;
}

export function isChannelLineCloseAction(action: unknown): boolean {
  return CHANNEL_LINE_CLOSE_ACTIONS.includes(
    String(action ?? "").trim().toLowerCase() as ChannelLineCloseAction,
  );
}

/** Field visibility for LRC + Regression Channel (shared channel_line_rules backend). */
export function isChannelLineIndicatorFieldHidden(
  indicatorName: IndicatorName,
  config: Record<string, unknown>,
  fieldKey: string,
): boolean {
  if (indicatorName !== "lrc" && indicatorName !== "regression") {
    return false;
  }

  const action = String(config.action ?? CHANNEL_LINE_TOUCH_ACTION).trim().toLowerCase();
  const windowType = String(config.window_type ?? "continuous").trim().toLowerCase();
  const confirmation = Boolean(config.confirmation);
  const phase2Action = isPhase2ChannelAction(action);

  if (fieldKey === "touch_type") {
    return action !== CHANNEL_LINE_TOUCH_ACTION;
  }

  if (fieldKey === "window") {
    return phase2Action;
  }

  if (fieldKey === "candles_since_min" || fieldKey === "candles_since_max") {
    return !phase2Action;
  }

  if (
    fieldKey === "min_consecutive_below" ||
    fieldKey === "below_candles_min" ||
    fieldKey === "below_candles_max" ||
    fieldKey === "require_still_above_now"
  ) {
    return !isReclaimChannelAction(action);
  }

  if (
    fieldKey === "confirmation_types" ||
    fieldKey === "confirmation_patterns" ||
    fieldKey === "confirmation_window"
  ) {
    return !confirmation;
  }

  if (indicatorName === "regression") {
    if (fieldKey === "length") {
      return windowType === "interval";
    }
    if (fieldKey === "interval_step") {
      return windowType !== "interval";
    }
  }

  return false;
}

// --------------------------------------------------
// TRENDY ADX (DI+/DI-/ADX, Bonavest reference) — condition catalog
// --------------------------------------------------

export type TrendyAdxMode = "bullish" | "bearish" | "compression" | "weak";

export type TrendyAdxDirection = "any" | "up" | "down" | "flat";

export type TrendyAdxConditionSub = "none" | "event_range" | "distance" | "direction_range";

export interface TrendyAdxConditionDef {
  id: string;
  label: string;
  sub: TrendyAdxConditionSub;
  category?: string;
}

export interface TrendyAdxCondition {
  id: string;
  candles_since?: number | null;
  candles_since_min?: number | null;
  candles_since_max?: number | null;
  active_candles_min?: number | null;
  active_candles_max?: number | null;
  direction?: TrendyAdxDirection;
  candles_since_direction_change_min?: number | null;
  candles_since_direction_change_max?: number | null;
  distance?: number | null;
}

export const TRENDY_ADX_DIRECTIONS: TrendyAdxDirection[] = ["any", "up", "down", "flat"];

export const TRENDY_ADX_DIRECTION_CONDITION_IDS = [
  "adx_direction",
  "di_plus_direction",
  "di_minus_direction",
] as const;

export const TRENDY_ADX_EVENT_CONDITION_IDS = [
  "di_crossed_above",
  "di_touched_bounced",
  "adx_crossed_above_20",
  "adx_crossed_above_dominant",
  "adx_crossed_above_opposing",
  "adx_crossed_above_both",
  "bg_just_started",
  "bg_changed_recently",
  "adx_turning_up",
] as const;

export const TRENDY_ADX_ACTIVE_CONDITION_IDS = [
  "di_already_above",
  "adx_below_20",
  "adx_above_20",
  "adx_above_25",
  "adx_above_40",
  "adx_below_dominant",
  "adx_above_dominant",
  "adx_near_dominant",
  "adx_below_opposing",
  "adx_above_opposing",
  "adx_near_opposing",
  "adx_below_both",
  "adx_between_both",
  "adx_above_both",
  "bg_active",
  "bg_active_for_x",
  "di_close_together",
  "di_touching",
  "di_close_no_separation",
  "adx_below_both_di",
] as const;

const TRENDY_ADX_DIRECTION_CONDITION_SET = new Set<string>(TRENDY_ADX_DIRECTION_CONDITION_IDS);
const TRENDY_ADX_EVENT_CONDITION_SET = new Set<string>(TRENDY_ADX_EVENT_CONDITION_IDS);
const TRENDY_ADX_ACTIVE_CONDITION_SET = new Set<string>(TRENDY_ADX_ACTIVE_CONDITION_IDS);

export function isTrendyAdxDirectionCondition(id: string): boolean {
  return TRENDY_ADX_DIRECTION_CONDITION_SET.has(id);
}

export function isTrendyAdxEventCondition(id: string): boolean {
  return TRENDY_ADX_EVENT_CONDITION_SET.has(id);
}

export function isTrendyAdxActiveCondition(id: string): boolean {
  return TRENDY_ADX_ACTIVE_CONDITION_SET.has(id);
}

export function defaultTrendyAdxCondition(id: string): TrendyAdxCondition {
  if (isTrendyAdxDirectionCondition(id)) {
    return {
      id,
      direction: "any",
      candles_since_direction_change_min: 0,
      candles_since_direction_change_max: 5,
    };
  }

  if (isTrendyAdxEventCondition(id)) {
    return {
      id,
      candles_since_min: 0,
      candles_since_max: 5,
    };
  }

  if (isTrendyAdxActiveCondition(id)) {
    return {
      id,
      active_candles_min: 1,
      active_candles_max: 5,
    };
  }

  return { id };
}

// Bullish and Bearish share the same condition set — "dominant"/"opposing" DI
// line is resolved server-side based on the selected mode.
export const TRENDY_ADX_DIRECTIONAL_CONDITIONS: TrendyAdxConditionDef[] = [
  // Phase 3 line direction filters
  { id: "adx_direction", label: "ADX Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_plus_direction", label: "DI+ Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_minus_direction", label: "DI- Direction", sub: "direction_range", category: "Line Direction" },

  // DI Line Comparisons / Crosses
  { id: "di_crossed_above", label: "DI cross: dominant line just crossed above opposing", sub: "event_range", category: "DI Line Crossovers & Position" },
  { id: "di_already_above", label: "DI already above (direction is active)", sub: "none", category: "DI Line Crossovers & Position" },
  { id: "di_near_cross", label: "DI close to crossing above (early watch)", sub: "distance", category: "DI Line Crossovers & Position" },
  { id: "di_touched_bounced", label: "DI touched opposing line and bounced", sub: "event_range", category: "DI Line Crossovers & Position" },
  { id: "di_separating", label: "DI separating upward (pressure getting stronger)", sub: "none", category: "DI Line Crossovers & Position" },
  { id: "di_opposite_falling_away", label: "Opposing DI falling away (weakening)", sub: "none", category: "DI Line Crossovers & Position" },

  // ADX Threshold Levels
  { id: "adx_below_20", label: "ADX below threshold (early but weak)", sub: "none", category: "ADX Threshold Levels" },
  { id: "adx_near_20", label: "ADX near threshold (strength building)", sub: "distance", category: "ADX Threshold Levels" },
  { id: "adx_crossed_above_20", label: "ADX crossed above threshold", sub: "event_range", category: "ADX Threshold Levels" },
  { id: "adx_above_20", label: "ADX above threshold (trend active)", sub: "none", category: "ADX Threshold Levels" },
  { id: "adx_above_25", label: "ADX above 25 (strong trend)", sub: "none", category: "ADX Threshold Levels" },
  { id: "adx_above_40", label: "ADX above 40 (very strong / possible exhaustion)", sub: "none", category: "ADX Threshold Levels" },

  // ADX vs Dominant DI
  { id: "adx_below_dominant", label: "ADX below dominant DI (strength not fully confirmed)", sub: "none", category: "ADX vs Dominant DI Line" },
  { id: "adx_near_dominant", label: "ADX close to dominant DI (almost confirmed)", sub: "distance", category: "ADX vs Dominant DI Line" },
  { id: "adx_crossed_above_dominant", label: "ADX crossed above dominant DI (confirmed)", sub: "event_range", category: "ADX vs Dominant DI Line" },
  { id: "adx_above_dominant", label: "ADX above dominant DI (active)", sub: "none", category: "ADX vs Dominant DI Line" },

  // ADX vs Opposing DI
  { id: "adx_below_opposing", label: "ADX below opposing DI (still weak)", sub: "none", category: "ADX vs Opposing DI Line" },
  { id: "adx_near_opposing", label: "ADX close to opposing DI", sub: "distance", category: "ADX vs Opposing DI Line" },
  { id: "adx_crossed_above_opposing", label: "ADX crossed above opposing DI (opposing pressure weakening)", sub: "event_range", category: "ADX vs Opposing DI Line" },
  { id: "adx_above_opposing", label: "ADX above opposing DI", sub: "none", category: "ADX vs Opposing DI Line" },

  // ADX vs Both DI Lines
  { id: "adx_below_both", label: "ADX below both DI lines (very early setup)", sub: "none", category: "ADX vs Both DI Lines" },
  { id: "adx_between_both", label: "ADX between the two DI lines (developing)", sub: "none", category: "ADX vs Both DI Lines" },
  { id: "adx_crossed_above_both", label: "ADX crossed above both DI lines (major confirmation)", sub: "event_range", category: "ADX vs Both DI Lines" },
  { id: "adx_above_both", label: "ADX above both DI lines (strong confirmation)", sub: "none", category: "ADX vs Both DI Lines" },

  // Background Zones
  { id: "bg_just_started", label: "Background zone just started", sub: "event_range", category: "Background Zones" },
  { id: "bg_active", label: "Background zone is active", sub: "none", category: "Background Zones" },
  { id: "bg_active_for_x", label: "Background zone active for at least X candles", sub: "none", category: "Background Zones" },
];

export const TRENDY_ADX_COMPRESSION_CONDITIONS: TrendyAdxConditionDef[] = [
  { id: "adx_direction", label: "ADX Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_plus_direction", label: "DI+ Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_minus_direction", label: "DI- Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_close_together", label: "DI+ and DI- close together", sub: "distance", category: "DI Convergence" },
  { id: "di_touching", label: "DI+ and DI- touching", sub: "none", category: "DI Convergence" },
  { id: "di_pink_toward_blue", label: "DI+ moving toward DI- (possible bearish setup forming)", sub: "none", category: "DI Convergence" },
  { id: "di_blue_toward_pink", label: "DI- moving toward DI+ (possible bullish setup forming)", sub: "none", category: "DI Convergence" },
  { id: "adx_below_20", label: "ADX below threshold", sub: "none", category: "ADX Strength" },
  { id: "adx_turning_up", label: "ADX turning up", sub: "event_range", category: "ADX Strength" },
  { id: "adx_close_to_20", label: "ADX close to threshold", sub: "distance", category: "ADX Strength" },
  { id: "bg_changed_recently", label: "Background changed recently", sub: "event_range", category: "Background State" },
];

export const TRENDY_ADX_WEAK_CONDITIONS: TrendyAdxConditionDef[] = [
  { id: "adx_direction", label: "ADX Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_plus_direction", label: "DI+ Direction", sub: "direction_range", category: "Line Direction" },
  { id: "di_minus_direction", label: "DI- Direction", sub: "direction_range", category: "Line Direction" },
  { id: "adx_below_20", label: "ADX below threshold", sub: "none", category: "ADX Weakness" },
  { id: "adx_below_both_di", label: "ADX below both DI lines", sub: "none", category: "ADX Weakness" },
  { id: "adx_falling", label: "ADX falling", sub: "none", category: "ADX Weakness" },
  { id: "adx_flat", label: "ADX flat", sub: "none", category: "ADX Weakness" },
  { id: "di_close_no_separation", label: "DI+ and DI- close with no separation", sub: "distance", category: "DI Separation" },
  { id: "bg_mixed_or_changing", label: "Background mixed or changing too often", sub: "none", category: "Background State" },
  { id: "no_clean_di_cross", label: "No clean DI cross recently", sub: "none", category: "Signals & Confirmation" },
  { id: "no_adx_confirmation", label: "No ADX confirmation recently", sub: "none", category: "Signals & Confirmation" },
];

export function trendyAdxConditionsForMode(mode: string): TrendyAdxConditionDef[] {
  if (mode === "bullish" || mode === "bearish") return TRENDY_ADX_DIRECTIONAL_CONDITIONS;
  if (mode === "compression") return TRENDY_ADX_COMPRESSION_CONDITIONS;
  if (mode === "weak") return TRENDY_ADX_WEAK_CONDITIONS;
  return [];
}

// --------------------------------------------------
// VLR PRECISION FILTER (Variable Linear Regression Oscillator, Gentleman-Goat)
// --------------------------------------------------

export const VLR_BULLISH_CROSSING_OPTIONS = [
  "red_below_green",
  "red_below_blue",
  "green_below_blue",
  "red_below_both",
  "multiple_bullish",
] as const;

export const VLR_BEARISH_CROSSING_OPTIONS = [
  "red_above_green",
  "red_above_blue",
  "green_above_blue",
  "red_above_both",
  "multiple_bearish",
] as const;

export const VLR_CANDLE_PATTERNS = [
  "bullish_engulfing",
  "bearish_engulfing",
  "hammer",
  "shooting_star",
  "morning_star",
  "evening_star",
] as const;

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    name: "rsi",
    fields: [
      { key: "length", label: "Length (Speed)", type: "number" },
      {
        key: "location",
        label: "Zone",
        type: "select",
        options: ["oversold", "neutral", "overbought"],
      },
      {
        key: "direction",
        label: "Momentum",
        type: "select",
        options: RSI_DIRECTIONS,
      },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
      { key: "window", label: "How Many Candles", type: "number" },
      { key: "confirmation", label: "Require Confirmation", type: "boolean" },
      {
        key: "confirmation_types",
        label: "Confirmation Type (Auto = patterns only)",
        type: "multi-select",
        options: CONFIRMATION_TYPES,
      },
      {
        key: "confirmation_patterns",
        label: "Confirmation Patterns",
        type: "multi-select",
        options: CONFIRMATION_PATTERNS,
      },
      { key: "confirmation_window", label: "Confirmation Window", type: "number" },
    ],
  },
  {
    name: "wavetrend",
    fields: [
      { key: "channel_length", label: "Channel Length", type: "number", min: 1 },
      { key: "average_length", label: "Average Length", type: "number", min: 1 },
      { key: "overbought_level_1", label: "Over Bought Level 1", type: "number" },
      { key: "overbought_level_2", label: "Over Bought Level 2", type: "number" },
      { key: "oversold_level_1", label: "Over Sold Level 1", type: "number" },
      { key: "oversold_level_2", label: "Over Sold Level 2", type: "number" },
      {
        key: "signal_length",
        label: "Signal Length",
        type: "number",
        min: 1,
        section: "Advanced Screening",
      },
      {
        key: "condition",
        label: "Condition",
        type: "select",
        options: [
          "cross_any",
          "cross_up",
          "cross_down",
          "oversold_cross_up",
          "overbought_cross_down",
          "oversold_watch",
          "overbought_watch",
          "turning_up_from_oversold",
          "turning_down_from_overbought",
          "rising",
          "falling",
          "turning_up",
          "turning_down",
        ],
        section: "Advanced Screening",
      },
      {
        key: "zone",
        label: "Zone",
        type: "select",
        options: ["any", "oversold", "oversold_level_1", "overbought", "overbought_level_1", "neutral"],
        section: "Advanced Screening",
      },
      { key: "window", label: "Window", type: "number", min: 1, section: "Advanced Screening" },
      { key: "tolerance_pct", label: "Tolerance %", type: "number", section: "Advanced Screening" },
      { key: "confirmation", label: "Require Confirmation", type: "boolean", section: "Advanced Screening" },
      {
        key: "confirmation_types",
        label: "Confirmation Type (Auto = patterns only)",
        type: "multi-select",
        options: CONFIRMATION_TYPES,
        section: "Advanced Screening",
      },
      {
        key: "confirmation_patterns",
        label: "Confirmation Patterns",
        type: "multi-select",
        options: CONFIRMATION_PATTERNS,
        section: "Advanced Screening",
      },
    ],
  },
  {
    name: "aroon",
    fields: [
      { key: "length", label: "Length (Speed)", type: "number" },
      {
        key: "level",
        label: "Strength",
        type: "select",
        options: [
          "above_50",
          "between_50_0",
          "near_0",
          "between_0_-50",
          "below_-50",
        ],
      },
      {
        key: "direction",
        label: "Momentum",
        type: "select",
        options: COMMON_DIRECTIONS,
      },
      { key: "extreme_level", label: "Extreme Level", type: "number" },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
      { key: "window", label: "How Many Candles", type: "number" },
      { key: "confirmation", label: "Require Confirmation", type: "boolean" },
      {
        key: "confirmation_types",
        label: "Confirmation Type (Auto = patterns only)",
        type: "multi-select",
        options: CONFIRMATION_TYPES,
      },
      {
        key: "confirmation_patterns",
        label: "Confirmation Patterns",
        type: "multi-select",
        options: CONFIRMATION_PATTERNS,
      },
      { key: "confirmation_window", label: "Confirmation Window", type: "number" },
    ],
  },
  {
    name: "adx",
    fields: [
      { key: "length", label: "Length", type: "number", min: 1 },
      { key: "threshold", label: "Threshold", type: "number", step: 0.1 },
      { key: "show_background_colors", label: "Show Background Colors?", type: "boolean" },
      {
        key: "background_color",
        label: "Background Color Choice",
        type: "select",
        options: ["green", "red"],
      },
      { key: "use_dark_theme", label: "Use Dark Theme for Black Backgrounds?", type: "boolean" },
      { key: "top_level", label: "Top Level", type: "number" },
      { key: "rising_level", label: "Rising Level", type: "number" },
      { key: "up_level", label: "Up Level", type: "number" },
      { key: "down_level", label: "Down Level", type: "number" },
      { key: "falling_level", label: "Falling Level", type: "number" },
      { key: "bottom_level", label: "Bottom Level", type: "number" },
      { key: "window", label: "Window", type: "number", min: 1, section: "Advanced Screening" },
      {
        key: "min_history",
        label: "History Depth",
        type: "number",
        min: 200,
        section: "Advanced Screening",
      },
      {
        key: "mode",
        label: "Filter Type",
        type: "select",
        options: ["bullish", "bearish", "compression", "weak"],
        section: "Advanced Screening",
      },
      { key: "conditions", label: "Conditions", type: "condition-list", section: "Advanced Screening" },
    ],
  },
  {
    name: "vlr",
    fields: [
      {
        key: "source",
        label: "Linear Regression Source",
        type: "select",
        options: ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4"],
      },
      { key: "num_regressions", label: "Number of Linear Regressions", type: "number" },
      { key: "start_period", label: "Start Period", type: "number" },
      { key: "period_increment", label: "Period Incrementor", type: "number" },
      { key: "deviation", label: "Deviation(s)", type: "number" },
      {
        key: "reversal_type",
        label: "Reversal Type",
        type: "select",
        options: ["exact", "early", "both"],
      },
      {
        key: "direction",
        label: "Direction",
        type: "select",
        options: ["bullish", "bearish", "both"],
      },
      { key: "timing_candles", label: "Timing (Candles Ago)", type: "number" },
      { key: "crossing_confirmation", label: "Crossing Confirmation", type: "boolean" },
      {
        key: "bullish_crossings",
        label: "Bullish Crossings",
        type: "multi-select",
        options: VLR_BULLISH_CROSSING_OPTIONS,
      },
      {
        key: "bearish_crossings",
        label: "Bearish Crossings",
        type: "multi-select",
        options: VLR_BEARISH_CROSSING_OPTIONS,
      },
      {
        key: "crossing_sequence",
        label: "Crossing Sequence",
        type: "select",
        options: ["any", "red_first", "green_first", "blue_first", "sequential"],
      },
      {
        key: "multiple_crossing_requirement",
        label: "Multiple Crossing Requirement",
        type: "select",
        options: ["at_least_1", "at_least_2", "all_selected"],
      },
      { key: "volume_confirmation", label: "Volume Confirmation", type: "boolean" },
      { key: "volume_min_ratio", label: "Minimum Relative Volume", type: "number" },
      { key: "candle_confirmation", label: "Candle Confirmation", type: "boolean" },
      {
        key: "candle_confirmation_patterns",
        label: "Candle Patterns",
        type: "multi-select",
        options: VLR_CANDLE_PATTERNS,
      },
    ],
  },
  {
    name: "lrc",
    fields: [
      { key: "length", label: "Lookback", type: "number" },
      { key: "upper_dev", label: "Upper Deviation", type: "number" },
      { key: "lower_dev", label: "Lower Deviation", type: "number" },
      {
        key: "lines",
        label: "Line",
        type: "multi-select",
        options: ["upper", "middle", "lower"],
      },
      {
        key: "action",
        label: "Signal",
        type: "select",
        options: CHANNEL_LINE_ACTIONS,
      },
      {
        key: "selection_mode",
        label: "Selection Mode",
        type: "select",
        options: CHANNEL_SELECTION_MODES,
      },
      {
        key: "touch_type",
        label: "Touch Details",
        type: "select",
        options: TOUCH_TYPES,
      },
      { key: "window", label: "How Many Candles", type: "number" },
      { key: "candles_since_min", label: "Candles Since Min", type: "number" },
      { key: "candles_since_max", label: "Candles Since Max", type: "number" },
      { key: "min_consecutive_below", label: "Min Consecutive Below", type: "number" },
      { key: "require_still_above_now", label: "Require Still Above Now", type: "boolean" },
      { key: "tolerance", label: "Tolerance %", type: "number" },
      {
        key: "r_filter",
        label: "R Filter",
        type: "select",
        options: LRC_R_FILTER_OPTIONS,
      },
      { key: "confirmation", label: "Require Confirmation", type: "boolean" },
      {
        key: "confirmation_types",
        label: "Confirmation Type (Auto = patterns only)",
        type: "multi-select",
        options: CONFIRMATION_TYPES,
      },
      {
        key: "confirmation_patterns",
        label: "Confirmation Patterns",
        type: "multi-select",
        options: CONFIRMATION_PATTERNS,
      },
      { key: "confirmation_window", label: "Confirmation Window", type: "number" },
    ],
  },
  {
    name: "regression",
    fields: [
      { key: "length", label: "Lookback", type: "number" },
      { key: "width_coeff", label: "Width Coefficient", type: "number" },
      {
        key: "window_type",
        label: "Window Type",
        type: "select",
        options: ["continuous", "interval"],
      },
      { key: "interval_step", label: "Interval Step", type: "number" },
      {
        key: "lines",
        label: "Line",
        type: "multi-select",
        options: ["upper", "middle", "lower", "q1", "q3"],
      },
      {
        key: "action",
        label: "Signal",
        type: "select",
        options: CHANNEL_LINE_ACTIONS,
      },
      {
        key: "selection_mode",
        label: "Selection Mode",
        type: "select",
        options: CHANNEL_SELECTION_MODES,
      },
      {
        key: "touch_type",
        label: "Touch Details",
        type: "select",
        options: TOUCH_TYPES,
      },
      { key: "window", label: "How Many Candles", type: "number" },
      { key: "candles_since_min", label: "Candles Since Min", type: "number" },
      { key: "candles_since_max", label: "Candles Since Max", type: "number" },
      { key: "min_consecutive_below", label: "Min Consecutive Below", type: "number" },
      { key: "require_still_above_now", label: "Require Still Above Now", type: "boolean" },
      { key: "tolerance", label: "Tolerance %", type: "number" },
      { key: "confirmation", label: "Require Confirmation", type: "boolean" },
      {
        key: "confirmation_types",
        label: "Confirmation Type (Auto = patterns only)",
        type: "multi-select",
        options: CONFIRMATION_TYPES,
      },
      {
        key: "confirmation_patterns",
        label: "Confirmation Patterns",
        type: "multi-select",
        options: CONFIRMATION_PATTERNS,
      },
      { key: "confirmation_window", label: "Confirmation Window", type: "number" },
    ],
  },
  {
    name: "trend",
    fields: [
      { key: "length", label: "Lookback", type: "number" },
      { key: "show_last_channel", label: "Show Last Channel", type: "boolean" },
      { key: "wait_for_break", label: "Wait For Break", type: "boolean" },
      {
        key: "selection_mode",
        label: "Selection Mode",
        type: "select",
        options: CHANNEL_SELECTION_MODES,
      },
      { key: "areas", label: "Area Rules", type: "area-list" },
    ],
  },
  {
    name: "linreg_candles",
    fields: [
      { key: "lr_length", label: "Line Length (TV: 11)", type: "number" },
      { key: "signal_smoothing", label: "Signal Smoothing (TV: 11)", type: "number" },
      {
        key: "sma_signal",
        label: "Simple MA (Signal Line)",
        type: "boolean",
      },
      {
        key: "lin_reg",
        label: "Lin Reg Candles",
        type: "boolean",
      },
      {
        key: "price_position",
        label: "Position",
        type: "select",
        options: ["above", "below", "on", "piercing_from_below", "piercing_from_above"],
      },
      {
        key: "close_location",
        label: "Close Location",
        type: "select",
        options: ["any", "close_above", "close_below", "close_on", "bullish", "bearish"],
      },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
      { key: "window", label: "How Many Candles", type: "number" },
      { key: "confirmation", label: "Require Confirmation", type: "boolean" },
      {
        key: "confirmation_type",
        label: "Confirmation Type (Auto = patterns only)",
        type: "select",
        options: ["bullish", "bearish", "strong_bullish", "strong_bearish"],
      },
      {
        key: "confirmation_patterns",
        label: "Confirmation Patterns",
        type: "multi-select",
        options: CONFIRMATION_PATTERNS,
      },
      { key: "confirmation_window", label: "Confirmation Window", type: "number" },
    ],
  },
  {
    name: "ema",
    fields: [],
  },
  {
    name: "macd",
    fields: [
      { key: "rule", label: "Signal", type: "select", options: ["bullish_cross", "bearish_cross", "above_zero", "below_zero"] },
      { key: "fast", label: "Fast Length", type: "number" },
      { key: "slow", label: "Slow Length", type: "number" },
      { key: "signal", label: "Signal Length", type: "number" },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
    ],
  },
  {
    name: "volume",
    fields: [
      { key: "vol_x", label: "Volume Multiplier", type: "number", min: 0, step: 0.1 },
      { key: "vol_ma", label: "Volume SMA Length", type: "number", min: 1 },
      { key: "only_valid_hl", label: "Only Use Valid Highs & Lows", type: "boolean" },
      { key: "only_hammers_shooters", label: "Only Use Hammers & Shooters", type: "boolean" },
      { key: "only_same_color", label: "Only Use Same-Close Volume Spikes", type: "boolean" },
      { key: "session", label: "Session Time", type: "text" },
    ],
  },
  {
    name: "relative_volume",
    fields: [
      { key: "length", label: "Lookback bars for Average", type: "number" },
      { key: "lsma_length", label: "LSMA Length", type: "number" },
      { key: "min_ratio", label: "Minimum RVOL", type: "number" },
      {
        key: "rule",
        label: "Signal",
        type: "select",
        options: [
          "above",
          "below",
          "between",
          "crossed_above",
          "crossed_below",
          "highest",
          "volume_alert",
          "increased_volume",
          "anomaly",
          "entry",
        ],
      },
      { key: "window", label: "Signal Window", type: "number" },
      { key: "vol_alert", label: "Alert when volume reaches", type: "number" },
      { key: "show_lsma_21", label: "Show LSMA 21 Entry Points", type: "boolean" },
      { key: "show_lsma_6", label: "Show LSMA 6 Entry Points", type: "boolean" },
      { key: "show_anomalies", label: "Show Anomalies", type: "boolean" },
      { key: "max_ratio", label: "Maximum RVOL", type: "number" },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
    ],
  },
  {
    name: "current_volume",
    fields: [
      {
        key: "enable_percentage_on_chart",
        label: "Enable/Disable Showing RVOL % On Chart",
        type: "boolean",
      },
      { key: "atr_length", label: "ATR Period", type: "number", min: 1 },
      {
        key: "smoothing",
        label: "Smoothing",
        type: "select",
        options: ["RMA", "SMA", "EMA", "WMA"],
      },
      {
        key: "atr_multiplier",
        label: "ATR Multiplier",
        type: "number",
        min: 0.01,
        max: 100,
        step: 0.05,
      },
      {
        key: "avg_count",
        label: "Number Of Bars Used For Averaging",
        type: "number",
        min: 1,
      },
    ],
  },
  {
    name: "float",
    fields: [
      { key: "min_value", label: "Minimum Float", type: "number" },
      { key: "max_value", label: "Maximum Float", type: "number" },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
    ],
  },
  {
    name: "shares_outstanding",
    fields: [
      { key: "min_value", label: "Minimum Shares", type: "number" },
      { key: "max_value", label: "Maximum Shares", type: "number" },
      { key: "tolerance_pct", label: "Tolerance %", type: "number" },
    ],
  },
  {
    name: "volatility",
    fields: [
      {
        key: "source",
        label: "Source",
        type: "select",
        options: ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4", "hlcc4"],
      },
      { key: "length", label: "Length", type: "number", min: 2 },
      { key: "atr_factor", label: "ATR factor", type: "number", min: 0.25, step: 0.25 },
      {
        key: "htf_selection",
        label: "Higher-timeframe selection",
        type: "select",
        options: [
          "None",
          "Discrete Steps (60min, 1D, 3D, 1W, 1M, 12M)",
          "Multiple Of Current TF",
          "Fixed TF",
        ],
      },
      { key: "htf_multiple", label: "Multiple of current TF", type: "number", min: 1 },
      {
        key: "fixed_timeframe",
        label: "Fixed TF",
        type: "select",
        options: ["1m", "5m", "15m", "30m", "60", "1h", "4h", "1D", "3D", "1W", "1M", "12M"],
      },
      { key: "detect_breaches", label: "Detect breaches by chart bars", type: "boolean" },
      { key: "repainting_htf", label: "Repainting HTF", type: "boolean" },
      {
        key: "rule",
        label: "Signal",
        type: "select",
        options: [
          "threshold",
          "trend_reversal",
          "change_to_uptrend",
          "change_to_downtrend",
          "uptrend",
          "downtrend",
          "price_cross_stop",
          "volatility_expansion",
          "volatility_contraction",
          "early_breach_uptrend",
          "early_breach_downtrend",
          "selected_alerts",
        ],
      },
      { key: "window", label: "Signal Window", type: "number", min: 1 },
      { key: "trend_reversal_alert", label: "Trend reversal", type: "boolean" },
      { key: "change_to_uptrend_alert", label: "Change to uptrend", type: "boolean" },
      { key: "change_to_downtrend_alert", label: "Change to downtrend", type: "boolean" },
      { key: "chart_breach_downtrend_alert", label: "Chart breach of HTF downtrend", type: "boolean" },
      { key: "chart_breach_uptrend_alert", label: "Chart breach of HTF uptrend", type: "boolean" },
      { key: "delay_minutes", label: "Delay in minutes", type: "number", min: 0, step: 0.5 },
      {
        key: "alert_frequency",
        label: "Alert frequency",
        type: "select",
        options: ["once_per_bar", "once_per_bar_close"],
      },
    ],
  },
];

const INDICATOR_DEFAULT_CONFIGS: Record<IndicatorName, Record<string, unknown>> = {
  rsi: {
    length: 14,
    location: "oversold",
    direction: "turning_up",
    tolerance_pct: 0,
    window: 1,
    confirmation: false,
    confirmation_type: null,
    confirmation_types: [],
    confirmation_patterns: [],
    confirmation_window: null,
  },
  wavetrend: {
    mode: "wt_cross_lb",
    channel_length: 10,
    average_length: 21,
    signal_length: 4,
    overbought_level_1: 60,
    overbought_level_2: 53,
    oversold_level_1: -60,
    oversold_level_2: -53,
    condition: "cross_any",
    zone: "any",
    window: 1,
    tolerance_pct: 0,
    confirmation: false,
  },
  aroon: {
    length: 14,
    level: "above_50",
    direction: "rising",
    extreme_level: 70,
    tolerance_pct: 0,
    window: 1,
    confirmation: false,
    confirmation_type: null,
    confirmation_types: [],
    confirmation_patterns: [],
    confirmation_window: null,
  },
  adx: {
    length: 11,
    threshold: 20,
    show_background_colors: false,
    background_color: "green",
    use_dark_theme: false,
    top_level: 19,
    rising_level: 10,
    up_level: 4,
    down_level: -4,
    falling_level: -10,
    bottom_level: -19,
    window: 1,
    min_history: 200,
  },
  vlr: {
    source: "close",
    num_regressions: 3,
    start_period: 12,
    period_increment: 12,
    deviation: 2,
    reversal_type: "both",
    direction: "both",
    timing_candles: 3,
    crossing_confirmation: false,
    bullish_crossings: [],
    bearish_crossings: [],
    crossing_sequence: "any",
    multiple_crossing_requirement: "at_least_1",
    volume_confirmation: false,
    volume_min_ratio: 1.5,
    candle_confirmation: false,
    candle_confirmation_patterns: [],
  },
  lrc: {
    length: 100,
    upper_dev: 2,
    lower_dev: 2,
    lines: ["middle"],
    action: "touch",
    selection_mode: "all",
    touch_type: "wick",
    window: 1,
    tolerance: 0,
    r_filter: "ignore",
    confirmation: false,
    confirmation_type: null,
    confirmation_types: [],
    confirmation_patterns: [],
    confirmation_window: null,
  },
  regression: {
    length: 200,
    width_coeff: 1,
    window_type: "continuous",
    interval_step: 1,
    lines: ["middle"],
    action: "touch",
    selection_mode: "all",
    touch_type: "wick",
    window: 1,
    tolerance: 0,
    confirmation: false,
    confirmation_type: null,
    confirmation_types: [],
    confirmation_patterns: [],
    confirmation_window: null,
  },
  trend: {
    length: 8,
    show_last_channel: true,
    wait_for_break: true,
    selection_mode: "all",
    areas: [{ ...DEFAULT_TREND_AREA_RULE }],
  },
  linreg_candles: {
    lr_length: 11,
    signal_smoothing: 11,
    sma_signal: true,
    lin_reg: true,
    price_position: "above",
    close_location: "any",
    tolerance_pct: 0,
    window: 1,
    confirmation: false,
    confirmation_type: null,
    confirmation_window: null,
    confirmation_patterns: [],
  },
  ema: {
    ...DEFAULT_EMA_CONFIG,
  },
  macd: {
    rule: "bullish_cross",
    fast: 12,
    slow: 26,
    signal: 9,
    tolerance_pct: 0,
  },
  volume: {
    vol_x: 1.5,
    vol_ma: 100,
    only_valid_hl: true,
    only_hammers_shooters: true,
    only_same_color: false,
    session: "0000-0000",
    rule: "either",
    window: 1,
    tolerance_pct: 0,
  },
  relative_volume: {
    length: 30,
    lsma_length: 50,
    min_ratio: 1.5,
    max_ratio: null,
    rule: "above",
    window: 1,
    vol_alert: 200000000,
    show_lsma_21: true,
    show_lsma_6: true,
    show_anomalies: true,
    tolerance_pct: 0,
  },
  current_volume: {
    enable_percentage_on_chart: true,
    atr_length: 14,
    smoothing: "RMA",
    atr_multiplier: 0.5,
    avg_count: 30,
    tolerance_pct: 0,
  },
  float: {
    min_value: 0,
    max_value: null,
    tolerance_pct: 0,
  },
  shares_outstanding: {
    min_value: 0,
    max_value: null,
    tolerance_pct: 0,
  },
  volatility: {
    mode: "vstop",
    source: "close",
    length: 20,
    atr_factor: 2,
    htf_selection: "Multiple Of Current TF",
    htf_multiple: 3,
    fixed_timeframe: "1D",
    detect_breaches: true,
    repainting_htf: false,
    rule: "threshold",
    window: 1,
    trend_reversal_alert: false,
    change_to_uptrend_alert: false,
    change_to_downtrend_alert: false,
    chart_breach_downtrend_alert: false,
    chart_breach_uptrend_alert: false,
    delay_minutes: 0,
    alert_frequency: "once_per_bar",
  },
};

export function getAllDefaultIndicatorConfigs(): Record<IndicatorName, Record<string, unknown>> {
  return structuredClone(INDICATOR_DEFAULT_CONFIGS);
}

export function getDefaultIndicatorConfig(name: IndicatorName): Record<string, unknown> {
  const config = INDICATOR_DEFAULT_CONFIGS[name];

  if (!config) {
    return {};
  }

  let runtimeOverrides: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem("screener.indicatorDefaults");
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
      if (parsed && typeof parsed === "object") {
        const normalized = { ...parsed };
        if (normalized.volume_spike && !normalized.volume) {
          normalized.volume = normalized.volume_spike;
        }
        if (normalized[name] && typeof normalized[name] === "object") {
          runtimeOverrides = normalized[name];
        }
      }
    }
  } catch {
    runtimeOverrides = {};
  }

  return structuredClone({
    ...config,
    ...runtimeOverrides,
  });
}

const CHANNEL_RESPECT_DEFAULT_CONFIG: Record<string, unknown> = {
  channel_type: "trend",
  line: "both",
  min_respect: 2,
  max_respect: null,
  tolerance_pct: 0.1,
  cluster_gap: 3,
  touch_type: "wick",
};

const CONFLUENCE_DEFAULT_CONFIG = {
  type: "bullish" as Confluence["type"],
  source_channel_types: ["trend", "lrc"] as [ChannelType, ChannelType],
  liquidity_sweep: false,
  lookback_candles: 4,
  tolerance_pct: 0.1,
  reclose_to_first_line: false,
};

function readPostFilterOverrides(key: "channel_respect" | "confluence"): Record<string, unknown> {
  try {
    const raw = localStorage.getItem("screener.postFilterDefaults");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && parsed[key] && typeof parsed[key] === "object") {
      return parsed[key] as Record<string, unknown>;
    }
  } catch {
    // ignore malformed overrides
  }
  return {};
}

export function getDefaultChannelRespectConfig(): Record<string, unknown> {
  return structuredClone({
    ...CHANNEL_RESPECT_DEFAULT_CONFIG,
    ...readPostFilterOverrides("channel_respect"),
  });
}

export function getDefaultConfluenceConfig(): typeof CONFLUENCE_DEFAULT_CONFIG {
  return structuredClone({
    ...CONFLUENCE_DEFAULT_CONFIG,
    ...readPostFilterOverrides("confluence"),
  });
}

export function normalizeDeadAssetsFilter(
  filter: DeadAssetsFilter | null,
): DeadAssetsFilter | null {
  if (!filter) {
    return null;
  }

  const validTypes = new Set<DeadTrendType>(ALL_DEAD_TREND_TYPES);
  const selected = new Set(
    (filter.dead_trend_types ?? []).filter((type): type is DeadTrendType =>
      validTypes.has(type),
    ),
  );

  // Rebuild from the canonical order instead of the user's click order, so
  // the outgoing request is always deterministic and de-duplicated -
  // without ever mutating the array the caller passed in.
  return {
    ...filter,
    dead_trend_types: ALL_DEAD_TREND_TYPES.filter((type) => selected.has(type)),
  };
}

function positiveInt(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.trunc(numeric);
}

function nonNegativeInt(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.trunc(numeric);
}

function uniquePositivePeriods(values: unknown, fallback: number[]): number[] {
  const rawPeriods = Array.isArray(values) ? values : [values];
  const periods = rawPeriods
    .map((value) => positiveInt(value, 0))
    .filter((value) => value > 0);

  return periods.length ? Array.from(new Set(periods)) : fallback;
}

function normalizeEmaSelectionMode(value: unknown): EmaSelectionMode {
  const mode = String(value ?? "any").trim().toLowerCase();
  return EMA_SELECTION_MODES.some((item) => item.value === mode)
    ? (mode as EmaSelectionMode)
    : "any";
}

function normalizeEmaCondition(
  name: EmaConditionName,
  value: unknown,
  fallback: EmaConditionConfig,
): EmaConditionConfig {
  const source = value && typeof value === "object"
    ? value as Partial<EmaConditionConfig>
    : {};
  const min = nonNegativeInt(source.candles_since_min, fallback.candles_since_min);
  const max = Math.max(
    min,
    nonNegativeInt(source.candles_since_max, fallback.candles_since_max),
  );
  const normalized: EmaConditionConfig = {
    enabled: Boolean(source.enabled),
    candles_since_min: min,
    candles_since_max: max,
  };

  if (name === "touched_or_pierced_and_closed_above") {
    normalized.require_still_above_now = source.require_still_above_now !== false;
  }

  return normalized;
}

function normalizeEmaConditions(rawConfig: Record<string, unknown>, hasExplicitConditions: boolean): EmaConditionsConfig {
  const rawConditions = rawConfig.conditions && typeof rawConfig.conditions === "object" && !Array.isArray(rawConfig.conditions)
    ? rawConfig.conditions as Partial<Record<EmaConditionName, EmaConditionConfig>>
    : {};
  const conditions = (Object.keys(DEFAULT_EMA_CONDITIONS) as EmaConditionName[]).reduce(
    (acc, name) => {
      const fallback = DEFAULT_EMA_CONDITIONS[name];
      acc[name] = normalizeEmaCondition(name, rawConditions[name], {
        ...fallback,
        enabled: hasExplicitConditions ? false : fallback.enabled,
      });
      return acc;
    },
    {} as EmaConditionsConfig,
  );

  const rule = String(rawConfig.rule ?? "").trim().toLowerCase();
  if (!hasExplicitConditions && rule) {
    Object.keys(conditions).forEach((name) => {
      conditions[name as EmaConditionName].enabled = false;
    });
    if (rule === "touch") {
      conditions.touch_from_above.enabled = true;
    } else {
      conditions.close_above.enabled = true;
    }
  }

  if (!Object.values(conditions).some((condition) => condition.enabled)) {
    conditions.close_above.enabled = true;
  }

  return conditions;
}

export function normalizeEmaConfig(rawConfig: Record<string, unknown> = {}): EmaConfig {
  const configuredPeriods =
    rawConfig.periods
      ?? rawConfig.ema_periods
      ?? rawConfig.lengths
      ?? rawConfig.length
      ?? DEFAULT_EMA_CONFIG.periods;
  const hasExplicitConditions =
    Object.prototype.hasOwnProperty.call(rawConfig, "conditions")
    && rawConfig.conditions !== undefined;

  return {
    periods: uniquePositivePeriods(configuredPeriods, DEFAULT_EMA_CONFIG.periods),
    selection_mode: normalizeEmaSelectionMode(rawConfig.selection_mode),
    conditions: normalizeEmaConditions(rawConfig, hasExplicitConditions),
  };
}

function normalizeChannelSelectionMode(value: unknown): ChannelSelectionMode {
  const normalized = String(value ?? "all").trim().toLowerCase();
  return CHANNEL_SELECTION_MODES.includes(normalized as ChannelSelectionMode)
    ? normalized as ChannelSelectionMode
    : "all";
}

function normalizePhase2ChannelFields(config: Record<string, unknown>): Record<string, unknown> {
  const action = String(config.action ?? "").trim().toLowerCase();
  if (!isPhase2ChannelAction(action)) {
    return config;
  }

  const next: Record<string, unknown> = {
    ...config,
    candles_since_min: config.candles_since_min ?? 0,
    candles_since_max: config.candles_since_max ?? 5,
    window: config.window ?? 1,
  };

  if (isReclaimChannelAction(action)) {
    next.min_consecutive_below = config.min_consecutive_below ?? 1;
    next.below_candles_min = config.below_candles_min ?? 1;
    next.below_candles_max = config.below_candles_max ?? 5;
    next.require_still_above_now = config.require_still_above_now ?? true;
  }

  return next;
}

function normalizeTrendAreaRule(area: unknown): AreaRule {
  const rawArea = area && typeof area === "object"
    ? area as Partial<AreaRule>
    : {};
  const merged = {
    ...DEFAULT_TREND_AREA_RULE,
    ...rawArea,
    area: rawArea.area ?? DEFAULT_TREND_AREA_RULE.area,
    action: rawArea.action ?? defaultTrendActionForArea(rawArea.area),
  } as AreaRule;

  return normalizePhase2ChannelFields(merged as unknown as Record<string, unknown>) as unknown as AreaRule;
}

function defaultTrendActionForArea(area?: string | null): string {
  return String(area ?? "").endsWith("_zone") ? "entered" : "touched";
}

function normalizeTrendyAdxDirection(value: unknown): TrendyAdxDirection {
  return TRENDY_ADX_DIRECTIONS.includes(value as TrendyAdxDirection)
    ? value as TrendyAdxDirection
    : "any";
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTrendyAdxCondition(condition: unknown): TrendyAdxCondition | null {
  if (!condition || typeof condition !== "object") return null;

  const raw = condition as TrendyAdxCondition;
  const id = String(raw.id ?? "").trim();
  if (!id) return null;

  const {
    candles_since: legacyCandlesSince,
    candles_since_min: rawEventMin,
    candles_since_max: rawEventMax,
    active_candles_min: rawActiveMin,
    active_candles_max: rawActiveMax,
    direction: rawDirection,
    candles_since_direction_change_min: rawDirectionMin,
    candles_since_direction_change_max: rawDirectionMax,
    ...rest
  } = raw;

  const next: TrendyAdxCondition = {
    ...rest,
    id,
  };

  if (raw.distance != null) {
    next.distance = raw.distance;
  }

  if (isTrendyAdxDirectionCondition(id)) {
    next.direction = normalizeTrendyAdxDirection(rawDirection);
    next.candles_since_direction_change_min = normalizeNullableNumber(rawDirectionMin) ?? 0;
    next.candles_since_direction_change_max = normalizeNullableNumber(rawDirectionMax) ?? 5;
  }

  if (isTrendyAdxEventCondition(id)) {
    const legacy = normalizeNullableNumber(legacyCandlesSince);
    next.candles_since_min = normalizeNullableNumber(rawEventMin) ?? 0;
    next.candles_since_max = normalizeNullableNumber(rawEventMax) ?? legacy ?? 5;
  }

  if (isTrendyAdxActiveCondition(id)) {
    const legacy = normalizeNullableNumber(legacyCandlesSince);
    next.active_candles_min = normalizeNullableNumber(rawActiveMin) ?? legacy ?? 1;
    next.active_candles_max = normalizeNullableNumber(rawActiveMax);
    if (next.active_candles_max == null && legacy == null) {
      next.active_candles_max = 5;
    }
  }

  return next;
}

function normalizeTrendyAdxConditions(conditions: unknown): TrendyAdxCondition[] | undefined {
  if (!Array.isArray(conditions)) return undefined;
  return conditions
    .map(normalizeTrendyAdxCondition)
    .filter((condition): condition is TrendyAdxCondition => condition != null);
}

export function normalizeIndicatorConfig(indicator: IndicatorConfig): IndicatorConfig {
  const defaults = getDefaultIndicatorConfig(indicator.name);
  const rawConfig = indicator.config ?? {};

  if (indicator.name === "ema") {
    const hasExplicitPeriods =
      rawConfig.periods != null
      || rawConfig.ema_periods != null
      || rawConfig.lengths != null
      || rawConfig.length != null;
    const hasExplicitConditions =
      Object.prototype.hasOwnProperty.call(rawConfig, "conditions")
      && rawConfig.conditions !== undefined;
    const emaConfigInput = {
      ...rawConfig,
      ...(hasExplicitPeriods ? {} : { periods: defaults.periods }),
      ...(rawConfig.selection_mode == null ? { selection_mode: defaults.selection_mode } : {}),
      ...(hasExplicitConditions || rawConfig.rule != null ? {} : { conditions: defaults.conditions }),
    };

    return {
      ...indicator,
      config: normalizeEmaConfig(emaConfigInput) as unknown as IndicatorConfig["config"],
    };
  }

  const config = normalizeConfirmationConfig({
    ...defaults,
    ...rawConfig,
  });

  if (indicator.name === "volume") {
    if (rawConfig.vol_x == null && rawConfig.multiplier != null) {
      config.vol_x = config.multiplier;
    }
    if (rawConfig.vol_ma == null && rawConfig.length != null) {
      config.vol_ma = config.length;
    }

    delete config.length;
    delete config.multiplier;
    delete config.volume_length;
    delete config.volume_threshold;
    delete config.min_ratio;
    delete config.min_volume;
    delete config.max_volume;
  }

  if (indicator.name === "wavetrend") {
    if (rawConfig.condition == null && rawConfig.direction != null) {
      const direction = String(rawConfig.direction);
      config.condition =
        direction === "crossed_up"
          ? "cross_up"
          : direction === "crossed_down"
            ? "cross_down"
            : direction;
    }

    if (config.mode === "wt_cross_lb") {
      delete config.threshold;
      delete config.direction;
      delete config.confirmation_type;
      delete config.confirmation_types;
      delete config.confirmation_patterns;
      delete config.confirmation_window;
    }
  }

  if (indicator.name === "lrc" || indicator.name === "regression") {
    const next = normalizePhase2ChannelFields({
      ...config,
      selection_mode: normalizeChannelSelectionMode(config.selection_mode),
    });

    return {
      ...indicator,
      config: next as IndicatorConfig["config"],
    };
  }

  if (indicator.name === "trend") {
    const rawAreas = Array.isArray(config.areas) ? config.areas : defaults.areas;
    const next = {
      ...config,
      selection_mode: normalizeChannelSelectionMode(config.selection_mode),
      areas: (rawAreas as unknown[]).map(normalizeTrendAreaRule),
    };

    return {
      ...indicator,
      config: next as IndicatorConfig["config"],
    };
  }

  if (indicator.name === "adx") {
    const normalizedConditions = normalizeTrendyAdxConditions(config.conditions);
    if (normalizedConditions === undefined) {
      delete config.conditions;
    } else {
      config.conditions = normalizedConditions;
    }
  }

  return {
    ...indicator,
    config: config as IndicatorConfig["config"],
  };
}

export function getDefaultChannelLength(channelType: ChannelType): number {
  switch (channelType) {
    case "lrc":
      return 100;
    case "regression":
      return 200;
    case "trend":
      return 8;
    default:
      return 20;
  }
}

export const SCREENING_MAX_CANDLES = 500;

export function resolveChannelRespectChannelLength(
  channelType: ChannelType,
  indicators: IndicatorConfig[] = [],
): number {
  const matchingIndicator = indicators.find((indicator) => indicator.name === channelType);
  const configuredLength = Number(matchingIndicator?.config?.length);
  if (Number.isFinite(configuredLength) && configuredLength > 0) {
    return Math.trunc(configuredLength);
  }
  return getDefaultChannelLength(channelType);
}

export function getChannelRespectHistoryCandleCount(
  channelType: ChannelType,
  channelLength = resolveChannelRespectChannelLength(channelType),
): number {
  if (channelType === "lrc") {
    return channelLength;
  }
  if (channelType === "regression") {
    return (2 * channelLength) - 1;
  }
  if (channelType === "trend") {
    return SCREENING_MAX_CANDLES;
  }
  return channelLength;
}

export function getChannelRespectTouchCandleCount(
  channelType: ChannelType,
  channelLength = resolveChannelRespectChannelLength(channelType),
): number | null {
  if (channelType === "trend") {
    return null;
  }
  return channelLength;
}

export function describeChannelRespectCandleWindow(
  channelRespect: Pick<ChannelRespect, "channel_type">,
  indicators: IndicatorConfig[] = [],
): {
  touchLabel: string;
  historyLabel: string;
  detail: string;
} {
  const channelType = channelRespect.channel_type;
  const channelLength = resolveChannelRespectChannelLength(channelType, indicators);
  const historyCandles = getChannelRespectHistoryCandleCount(channelType, channelLength);
  const touchCandles = getChannelRespectTouchCandleCount(channelType, channelLength);
  const matchingIndicator = indicators.some((indicator) => indicator.name === channelType);
  const lengthSource = matchingIndicator
    ? `Uses your ${channelType === "lrc" ? "LRC" : channelType === "regression" ? "Regression Channel" : "Trend Channel"} indicator length (${channelLength}).`
    : `Uses the default ${channelType === "lrc" ? "LRC" : channelType === "regression" ? "regression" : "trend"} channel length (${channelLength}).`;

  if (channelType === "trend") {
    return {
      touchLabel: "Touch window: active trend channel segment (varies per symbol)",
      historyLabel: `History loaded: up to ${historyCandles} candles`,
      detail: `${lengthSource} Channel Respect counts touches only on the current active trend channel, not the full ${historyCandles}-bar history.`,
    };
  }

  return {
    touchLabel: `Touch window: last ${touchCandles} completed candles`,
    historyLabel: `History loaded: ${historyCandles} candles`,
    detail: `${lengthSource} Every touch in that window can count toward min/max respect (cluster grouping still applies).`,
  };
}

export function getConfluenceSelectionOptions(
  channelType: ChannelType,
): readonly ConfluenceSelection[] {
  if (channelType === "trend") {
    return [
      "top_line",
      "middle_line",
      "bottom_line",
      "top_zone",
      "bottom_zone",
    ] as const;
  }

  return ["upper", "middle", "lower"] as const;
}

export const CONFLUENCE_UI_SIGNAL_TYPES = ["bullish", "bearish", "breakout", "role_reversal"] as const;
export type ConfluenceUiSignalType = (typeof CONFLUENCE_UI_SIGNAL_TYPES)[number];

export function isConfluenceUiSignalType(
  type: Confluence["type"] | null | undefined,
): type is ConfluenceUiSignalType {
  return CONFLUENCE_UI_SIGNAL_TYPES.includes(type as ConfluenceUiSignalType);
}

const BULLISH_CONFLUENCE_SELECTIONS: Record<ChannelType, readonly ConfluenceSelection[]> = {
  trend: ["bottom_line", "bottom_zone"],
  lrc: ["lower"],
  regression: ["lower"],
};

const BEARISH_CONFLUENCE_SELECTIONS: Record<ChannelType, readonly ConfluenceSelection[]> = {
  trend: ["top_line", "top_zone"],
  lrc: ["upper"],
  regression: ["upper"],
};

function breakoutConfluenceSelections(
  channelType: ChannelType,
  sourceIndex: number,
): readonly ConfluenceSelection[] {
  if (sourceIndex === 0) {
    return channelType === "trend" ? ["top_line", "top_zone"] : ["upper"];
  }

  return channelType === "trend"
    ? ["top_line", "top_zone", "bottom_line", "bottom_zone"]
    : ["upper", "lower"];
}

// Role Reversal: Source 1 breaks a resistance line/zone, then Source 2
// confirms the flip by holding as support within the next few candles.
function roleReversalConfluenceSelections(
  channelType: ChannelType,
  sourceIndex: number,
): readonly ConfluenceSelection[] {
  if (sourceIndex === 0) {
    return channelType === "trend" ? ["top_line", "top_zone"] : ["upper"];
  }

  return channelType === "trend" ? ["bottom_line", "bottom_zone"] : ["lower"];
}

export function getAllowedConfluenceSelections(
  confluenceType: ConfluenceUiSignalType,
  channelType: ChannelType,
  sourceIndex = 0,
): ConfluenceSelection[] {
  if (confluenceType === "bullish") {
    return [...BULLISH_CONFLUENCE_SELECTIONS[channelType]];
  }
  if (confluenceType === "bearish") {
    return [...BEARISH_CONFLUENCE_SELECTIONS[channelType]];
  }
  if (confluenceType === "role_reversal") {
    return [...roleReversalConfluenceSelections(channelType, sourceIndex)];
  }
  return [...breakoutConfluenceSelections(channelType, sourceIndex)];
}

export function isAllowedConfluenceSelection(
  confluenceType: ConfluenceUiSignalType,
  channelType: ChannelType,
  selection: ConfluenceSelection,
  sourceIndex = 0,
): boolean {
  return getAllowedConfluenceSelections(confluenceType, channelType, sourceIndex).includes(selection);
}

export function areConfluenceSourcesEquivalent(
  left: Pick<ConfluenceSource, "channel_type" | "length" | "selection">,
  right: Pick<ConfluenceSource, "channel_type" | "length" | "selection">,
): boolean {
  return (
    left.channel_type === right.channel_type
    && left.length === right.length
    && left.selection === right.selection
  );
}

export function wouldDuplicateConfluenceSource(
  sources: ConfluenceSource[],
  sourceIndex: number,
  patch: Partial<ConfluenceSource>,
): boolean {
  const otherIndex = sourceIndex === 0 ? 1 : 0;
  const current = sources[sourceIndex];
  const other = sources[otherIndex];
  if (!current || !other) {
    return false;
  }

  const next = {
    channel_type: patch.channel_type ?? current.channel_type,
    length: patch.length ?? current.length,
    selection: patch.selection ?? current.selection,
  };

  return areConfluenceSourcesEquivalent(next, other);
}

function alternateConfluenceChannelType(channelType: ChannelType): ChannelType {
  if (channelType === "trend") {
    return "lrc";
  }
  if (channelType === "lrc") {
    return "regression";
  }
  return "trend";
}

function bumpConfluenceChannelLength(channelType: ChannelType, length: number): number {
  if (channelType === "trend") {
    return length + 4;
  }
  if (channelType === "lrc") {
    return length + 50;
  }
  return length + 50;
}

export function getMinimumConfluenceSourceLength(
  sources: ConfluenceSource[],
  sourceIndex: number,
  channelType: ChannelType,
): number {
  const otherIndex = sourceIndex === 0 ? 1 : 0;
  const other = sources[otherIndex];
  if (!other || other.channel_type !== channelType) {
    return 2;
  }
  return other.length + 1;
}

function normalizeConfluenceSourceForUi(
  source: ConfluenceSource,
  sourceIndex: number,
  confluenceType: ConfluenceUiSignalType,
): ConfluenceSource {
  const allowed = getAllowedConfluenceSelections(
    confluenceType,
    source.channel_type,
    sourceIndex,
  );
  const selection = allowed.includes(source.selection)
    ? source.selection
    : getDefaultConfluenceSelection(source.channel_type, confluenceType, sourceIndex);

  return createConfluenceSource(
    source.channel_type,
    {
      ...source,
      selection,
      length: Math.max(2, Number(source.length) || getDefaultChannelLength(source.channel_type)),
    },
    sourceIndex,
    confluenceType,
  );
}

function resolveDuplicateConfluenceSource(
  first: ConfluenceSource,
  second: ConfluenceSource,
  confluenceType: ConfluenceUiSignalType,
): ConfluenceSource {
  const allowed = getAllowedConfluenceSelections(
    confluenceType,
    second.channel_type,
    1,
  );

  const alternateSelection = allowed.find((selection) => !areConfluenceSourcesEquivalent(
    first,
    { ...second, selection },
  ));
  if (alternateSelection) {
    return createConfluenceSource(
      second.channel_type,
      { ...second, selection: alternateSelection },
      1,
      confluenceType,
    );
  }

  const bumpedLength = bumpConfluenceChannelLength(second.channel_type, first.length);
  if (!areConfluenceSourcesEquivalent(first, { ...second, length: bumpedLength })) {
    return createConfluenceSource(
      second.channel_type,
      { ...second, length: bumpedLength },
      1,
      confluenceType,
    );
  }

  const alternateChannelType = alternateConfluenceChannelType(second.channel_type);
  return createConfluenceSource(
    alternateChannelType,
    {
      ...second,
      length: getDefaultChannelLength(alternateChannelType),
      selection: getDefaultConfluenceSelection(alternateChannelType, confluenceType, 1),
    },
    1,
    confluenceType,
  );
}

export function sanitizeConfluenceUiConfig(confluence: Confluence): Confluence {
  const confluenceType: ConfluenceUiSignalType = isConfluenceUiSignalType(confluence.type)
    ? confluence.type
    : "bullish";

  const normalized = normalizeConfluenceConfig({
    ...confluence,
    type: confluenceType,
  });
  if (!normalized?.sources || normalized.sources.length < 2) {
    return normalized ?? confluence;
  }

  let sources = normalized.sources.map((source, index) =>
    normalizeConfluenceSourceForUi(source, index, confluenceType),
  );

  if (areConfluenceSourcesEquivalent(sources[0], sources[1])) {
    sources = [
      sources[0],
      resolveDuplicateConfluenceSource(sources[0], sources[1], confluenceType),
    ];
  }

  const second = sources[1];
  if (
    sources[0].channel_type === second.channel_type
    && second.length <= sources[0].length
  ) {
    sources[1] = createConfluenceSource(
      second.channel_type,
      {
        ...second,
        length: getMinimumConfluenceSourceLength(sources, 1, second.channel_type),
      },
      1,
      confluenceType,
    );
  }

  return normalizeConfluenceConfig({
    ...normalized,
    type: confluenceType,
    sources,
    channels: sources.map((source) => source.channel_type),
  }) ?? normalized;
}

export function describeConfluenceSelectionConstraint(
  confluenceType: ConfluenceUiSignalType,
  sourceIndex: number,
): string {
  if (confluenceType === "bullish") {
    return sourceIndex === 0
      ? "Bullish scans use support lines/zones only."
      : "Pick a different support line/zone than Source 1, or use a different channel/length.";
  }
  if (confluenceType === "bearish") {
    return sourceIndex === 0
      ? "Bearish scans use resistance lines/zones only."
      : "Pick a different resistance line/zone than Source 1, or use a different channel/length.";
  }
  if (confluenceType === "role_reversal") {
    return sourceIndex === 0
      ? "Role Reversal Source 1 uses resistance lines/zones — the level that breaks and flips to support."
      : "Role Reversal Source 2 uses support lines/zones — confirms the flip within the next few candles.";
  }
  return sourceIndex === 0
    ? "Breakout Source 1 uses resistance lines/zones."
    : "Breakout Source 2 can use resistance or support lines/zones.";
}

export function getDefaultConfluenceSelection(
  channelType: ChannelType,
  confluenceType: Confluence["type"] = "bullish",
  sourceIndex = 0,
): ConfluenceSelection {
  if (confluenceType === "role_reversal" && sourceIndex === 1) {
    return channelType === "trend" ? "bottom_line" : "lower";
  }

  if (confluenceType === "bullish") {
    return channelType === "trend" ? "bottom_line" : "lower";
  }

  if (confluenceType === "any" && sourceIndex === 0) {
    return channelType === "trend" ? "bottom_line" : "lower";
  }

  return channelType === "trend" ? "top_line" : "upper";
}

export function formatConfluenceSelectionLabel(selection: ConfluenceSelection): string {
  return selection.replace(/_/g, " ");
}

function buildConfluenceSourceId(channelType: ChannelType, suffix?: string): string {
  if (suffix) {
    return `${channelType}-${suffix}`;
  }

  return `${channelType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createConfluenceSource(
  channelType: ChannelType,
  overrides: Partial<ConfluenceSource> = {},
  fallbackIndex?: number,
  confluenceType: Confluence["type"] = "bullish",
): ConfluenceSource {
  return {
    id:
      overrides.id ??
      buildConfluenceSourceId(
        channelType,
        fallbackIndex === undefined ? undefined : `legacy-${fallbackIndex}`,
      ),
    channel_type: channelType,
    selection:
      overrides.selection
      ?? getDefaultConfluenceSelection(channelType, confluenceType, fallbackIndex ?? 0),
    length: Math.max(
      2,
      Number(overrides.length) || getDefaultChannelLength(channelType),
    ),
    width_coeff: overrides.width_coeff ?? null,
    upper_dev: overrides.upper_dev ?? null,
    lower_dev: overrides.lower_dev ?? null,
    window_type: overrides.window_type ?? null,
    interval_step:
      overrides.interval_step == null
        ? null
        : Math.max(1, Number(overrides.interval_step) || 1),
    line_relation: overrides.line_relation ?? "none",
    target_line: overrides.target_line ?? null,
    candles_since_close_min:
      overrides.candles_since_close_min == null
        ? null
        : Math.max(0, Number(overrides.candles_since_close_min) || 0),
    candles_since_close_max:
      overrides.candles_since_close_max == null
        ? null
        : Math.max(0, Number(overrides.candles_since_close_max) || 0),
  };
}

export function normalizeConfluenceConfig(confluence: Confluence | null): Confluence | null {
  if (!confluence) {
    return null;
  }

  const normalizedType =
    confluence.type === "bullish"
    || confluence.type === "bearish"
    || confluence.type === "breakout"
    || confluence.type === "role_reversal"
    || confluence.type === "any"
      ? confluence.type
      : "bullish";

  const fallbackChannelTypes: ChannelType[] =
    Array.isArray(confluence.channels) && confluence.channels.length > 0
      ? confluence.channels.slice(0, 2)
      : ["trend", "lrc"];

  const rawSources =
    Array.isArray(confluence.sources) && confluence.sources.length > 0
      ? confluence.sources
      : fallbackChannelTypes.map((channelType, index) =>
          createConfluenceSource(channelType, {}, index, normalizedType),
        );

  const sources = rawSources.slice(0, 2).map((source, index) => {
    const channelType = source.channel_type ?? confluence.channels?.[index] ?? "lrc";
    return createConfluenceSource(channelType, source, index, normalizedType);
  });

  while (sources.length < 2) {
    const fallbackIndex = sources.length;
    const fallbackChannelType = fallbackChannelTypes[fallbackIndex] ?? "lrc";
    sources.push(
      createConfluenceSource(
        fallbackChannelType,
        {},
        fallbackIndex,
        normalizedType,
      ),
    );
  }

  return {
    ...confluence,
    type: normalizedType,
    sources,
    channels: sources.map((source) => source.channel_type),
    liquidity_sweep: Boolean(confluence.liquidity_sweep),
    lookback_candles: Math.max(1, Number(confluence.lookback_candles) || 4),
    tolerance_pct: Number.isFinite(Number(confluence.tolerance_pct))
      ? Number(confluence.tolerance_pct)
      : 0.1,
    reclose_to_first_line: Boolean(confluence.reclose_to_first_line),
  };
}

export interface ScanProgressEvent {
  type?: string;
  scan_id?: string;
  timestamp?: number;
  stage?: string;
  message?: string;
  symbol?: string | null;
  current?: number | null;
  total?: number | null;
  detail?: string | null;
}

export interface ScanProgressLogEntry {
  stage: string;
  message: string;
  symbol: string | null;
  timestamp: number;
}

export interface ScanProgressState {
  connected: boolean;
  stage: string | null;
  message: string;
  symbol: string | null;
  current: number | null;
  total: number | null;
  detail: string | null;
  log: ScanProgressLogEntry[];
}
