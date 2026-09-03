import { X } from "lucide-react";
import type { FilterDetail, IndicatorDetail, ScreenerResult, ScreenerResultDetail } from "@/types/screener";
import { getIndicatorColor } from "./indicatorColors";
import { CopyResultDetailButton } from "./dev/CopyResultDetailButton";
import { appEnv } from "@/config/env";
import { useUserSettings } from "@/hooks/useUserSettings";
import { describeLatestCandleConsidered, formatDateValue, formatUnixSeconds } from "@/lib/dates";
import { ResultDetailChart } from "./ResultDetailChart";

interface Props {
  result: ScreenerResult;
  detail?: ScreenerResultDetail | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  const abs = Math.abs(value);

  if (abs === 0) {
    return "$0.00";
  }

  if (abs >= 1) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (abs >= 0.01) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }

  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  return value.toLocaleString();
}

function humanizeToken(value: unknown): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function timeframeLabel(value: string | null | undefined): string {
  const token = String(value || "").toLowerCase();
  const map: Record<string, string> = {
    "1m": "1 minute",
    "5m": "5 minutes",
    "15m": "15 minutes",
    "30m": "30 minutes",
    "1h": "1 hour",
    "4h": "4 hours",
    "1day": "1 day",
    "1d": "1 day",
    "1w": "1 week",
    "1mo": "1 month",
  };
  return map[token] || humanizeToken(token) || "Selected chart period";
}

function stageLabel(value: string | null | undefined): string {
  const token = String(value || "single").toLowerCase();
  if (token === "gate") return "Gate scan";
  if (token === "entry") return "Entry scan";
  return "Single scan";
}

function jsonString(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function JsonBlock({ title, value, defaultOpen = false }: { title: string; value: unknown; defaultOpen?: boolean }) {
  const empty =
    value === null
    || value === undefined
    || (typeof value === "object" && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0)
    || (Array.isArray(value) && value.length === 0);

  if (empty) {
    return null;
  }

  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-border/60 bg-background/25 p-4"
    >
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
        {title}
      </summary>
      <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-border/50 bg-secondary/35 p-3 text-xs leading-5 text-muted-foreground">
        {jsonString(value)}
      </pre>
    </details>
  );
}

function MetaCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1 rounded-2xl border border-border/60 bg-background/35 p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
      {hint ? <div className="text-[11px] leading-4 text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function SignalBadge({ label }: { label: string }) {
  const color = getIndicatorColor(label);
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${color.bg} ${color.text} ${color.border}`}>
      {label}
    </span>
  );
}

function DetailStatusBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
        passed
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-rose-400/30 bg-rose-400/10 text-rose-200"
      }`}
    >
      {passed ? "Matched" : "Did not match"}
    </span>
  );
}

function OhlcRow({
  title,
  open,
  high,
  low,
  close,
  accent,
}: {
  title: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  accent?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border/50 bg-background/40 p-3 ${accent || ""}`}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div><span className="text-muted-foreground">Open</span><div className="font-mono text-foreground">{formatPrice(open)}</div></div>
        <div><span className="text-muted-foreground">High</span><div className="font-mono text-foreground">{formatPrice(high)}</div></div>
        <div><span className="text-muted-foreground">Low</span><div className="font-mono text-foreground">{formatPrice(low)}</div></div>
        <div><span className="text-muted-foreground">Close</span><div className="font-mono text-foreground">{formatPrice(close)}</div></div>
      </div>
    </div>
  );
}

function LinRegEvidenceCard({ evidence }: { evidence: Record<string, unknown> }) {
  const evaluationBar = (evidence.evaluation_bar || {}) as Record<string, unknown>;
  const virtual = (evaluationBar.virtual_linreg || {}) as Record<string, number | null>;
  const raw = (evaluationBar.raw || {}) as Record<string, number | null>;
  const settings = (evidence.settings || {}) as Record<string, unknown>;
  const ruleChecks = (evidence.rule_checks || {}) as Record<string, Record<string, unknown>>;
  const forming = evidence.forming_bar_skipped as Record<string, unknown> | null | undefined;
  const passed = Boolean(evidence.passed);

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">Linear Regression Candles</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {String(evidence.plain_language || evidence.summary || "LinReg check details")}
          </div>
        </div>
        <DetailStatusBadge passed={passed} />
      </div>

      {forming ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
          Market bar still forming — filter used the last completed candle, not the live incomplete bar.
          {forming.time != null ? ` Skipped bar: ${formatUnixSeconds(Number(forming.time))}.` : ""}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <MetaCard
          label="Checked candle"
          value={formatUnixSeconds(typeof evaluationBar.time === "number" ? evaluationBar.time : null)}
          hint="This is the bar to open on TradingView"
        />
        <MetaCard
          label="White signal line"
          value={formatPrice(typeof evaluationBar.signal_line === "number" ? evaluationBar.signal_line : null)}
          hint="Compare against the white line on Humble LinReg Candles"
        />
      </div>

      <OhlcRow
        title="LinReg candle (what the filter used)"
        open={virtual.open}
        high={virtual.high}
        low={virtual.low}
        close={virtual.close}
        accent="border-emerald-400/20"
      />

      <OhlcRow
        title="Normal price candle (for reference only)"
        open={raw.open}
        high={raw.high}
        low={raw.low}
        close={raw.close}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-background/35 p-3 text-xs">
          <div className="text-muted-foreground">Position rule</div>
          <div className="mt-1 font-medium text-foreground">
            {String(ruleChecks.price_position?.label || settings.price_position || "—")}
          </div>
          <div className="mt-1 text-muted-foreground">
            {ruleChecks.price_position?.passed ? "Matched" : "Not matched"}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/35 p-3 text-xs">
          <div className="text-muted-foreground">Close rule</div>
          <div className="mt-1 font-medium text-foreground">
            {String(ruleChecks.close_location?.label || settings.close_location || "Any")}
          </div>
          <div className="mt-1 text-muted-foreground">
            {ruleChecks.close_location?.passed === false ? "Not matched" : "Matched / not required"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-background/25 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        Settings used: length {String(settings.lr_length ?? 11)}, smoothing {String(settings.signal_smoothing ?? 11)},{" "}
        {settings.sma_signal === false ? "EMA signal" : "SMA signal"},{" "}
        {settings.lin_reg === false ? "raw candles" : "LinReg candles"}.
        {" "}
        {String(evidence.data_note || "")}
      </div>
    </div>
  );
}

const CHANNEL_INDICATORS = new Set(["lrc", "regression", "trend"]);

function phase2FailureMessage(reason: unknown): string | null {
  if (reason === "below_candles_out_of_range") {
    return "Rejected because the latest reclaim was below the line for more candles than allowed.";
  }
  if (!reason) return null;
  return humanizeToken(reason);
}

function phase2ActionHelp(action: unknown): string | null {
  if (action === "piercing_from_below") {
    return "Piercing From Below requires the candle to open below the line, trade through the line, and close above it.";
  }
  if (action === "reclaimed_from_below_bullish") {
    return "Reclaimed From Below validates the latest raw reclaim first, then checks the configured candle ranges.";
  }
  if (action === "rejected_from_above_bullish") {
    return "Rejected From Above requires price to approach from above, touch or pierce the line, and close back above it.";
  }
  if (action === "rejected_from_below_bearish") {
    return "Rejected From Below requires price to approach from below, touch or pierce the line, and close back below it.";
  }
  return null;
}

function readChannelInteractions(evidence: Record<string, unknown>): Array<Record<string, unknown>> {
  const entries = evidence.channel_interactions;
  if (Array.isArray(entries)) return entries as Array<Record<string, unknown>>;
  return [evidence];
}

function hasPhase2ChannelEvidence(evidence: Record<string, unknown>): boolean {
  return readChannelInteractions(evidence).some((entry) => (
    entry.action
    || entry.failure_reason
    || entry.below_candles != null
    || entry.candles_since != null
  ));
}

function channelConfigForInteraction(item: IndicatorDetail, entry: Record<string, unknown>): Record<string, unknown> {
  const config = item.config as Record<string, unknown>;
  const areas = Array.isArray(config.areas) ? config.areas as Array<Record<string, unknown>> : [];
  if (areas.length === 0) return config;

  const areaName = String(entry.area ?? entry.line ?? "").trim().toLowerCase();
  const action = String(entry.action ?? "").trim().toLowerCase();
  return areas.find((area) => {
    const sameArea = String(area.area ?? "").trim().toLowerCase() === areaName;
    const sameAction = !action || String(area.action ?? "").trim().toLowerCase() === action;
    return sameArea && sameAction;
  }) ?? config;
}

function ChannelEvidenceCard({ item, evidence, showTechnical }: {
  item: IndicatorDetail;
  evidence: Record<string, unknown>;
  showTechnical: boolean;
}) {
  const interactions = readChannelInteractions(evidence);

  return (
    <div className="space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{humanizeToken(item.name)}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            Phase 2 channel interaction details from the backend.
          </div>
        </div>
        <DetailStatusBadge passed={item.passed} />
      </div>

      <div className="grid gap-3">
        {interactions.map((entry, index) => {
          const action = entry.action;
          const config = channelConfigForInteraction(item, entry);
          const failureMessage = phase2FailureMessage(entry.failure_reason);
          const actionHelp = phase2ActionHelp(action);

          return (
            <div key={`${String(action || "channel")}-${index}`} className="space-y-3 rounded-xl border border-border/50 bg-background/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-foreground">
                  {humanizeToken(action || "Channel interaction")}
                  {entry.line ? ` - ${humanizeToken(entry.line)}` : ""}
                  {entry.area ? ` - ${humanizeToken(entry.area)}` : ""}
                </div>
                {"matched" in entry ? (
                  <DetailStatusBadge passed={Boolean(entry.matched)} />
                ) : null}
              </div>

              {actionHelp ? (
                <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {actionHelp}
                </div>
              ) : null}

              {failureMessage ? (
                <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
                  {failureMessage}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {entry.candles_since != null ? (
                  <MetaCard
                    label={action === "reclaimed_from_below_bullish" ? "Candles since reclaim" : "Candles since event"}
                    value={formatNumber(Number(entry.candles_since))}
                  />
                ) : null}
                {entry.below_candles != null ? (
                  <MetaCard label="Below candles count" value={formatNumber(Number(entry.below_candles))} />
                ) : null}
                {action === "reclaimed_from_below_bullish" ? (
                  <>
                    <MetaCard
                      label="Configured Below Candles Min"
                      value={formatNumber(Number(config.below_candles_min ?? entry.below_candles_min ?? 1))}
                    />
                    <MetaCard
                      label="Configured Below Candles Max"
                      value={formatNumber(Number(config.below_candles_max ?? entry.below_candles_max ?? 5))}
                    />
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {showTechnical ? <JsonBlock title="Indicator Config" value={item.config} /> : null}
      {showTechnical ? <JsonBlock title="Evidence" value={evidence} /> : null}
    </div>
  );
}

function FriendlyIndicatorCard({ item, showTechnical }: { item: IndicatorDetail; showTechnical: boolean }) {
  const evidence = item.evidence && !Array.isArray(item.evidence) ? item.evidence : null;
  const isLinReg = item.name === "linreg_candles" && evidence;
  const isChannel = CHANNEL_INDICATORS.has(item.name) && evidence;

  if (isLinReg) {
    return (
      <div className="space-y-3">
        <LinRegEvidenceCard evidence={evidence} />
        {showTechnical ? <JsonBlock title="Raw indicator config" value={item.config} /> : null}
        {showTechnical ? <JsonBlock title="Raw evidence JSON" value={evidence} /> : null}
      </div>
    );
  }

  if (isChannel && hasPhase2ChannelEvidence(evidence)) {
    return (
      <ChannelEvidenceCard
        item={item}
        evidence={evidence}
        showTechnical={showTechnical}
      />
    );
  }

  const plain =
    evidence && typeof evidence.plain_language === "string"
      ? evidence.plain_language
      : evidence && typeof evidence.summary === "string"
        ? evidence.summary
        : item.sticker
          ? "This filter matched for the selected settings."
          : item.passed
            ? "This filter passed."
            : "This filter did not pass.";

  return (
    <div className="rounded-2xl border border-border/60 bg-background/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold capitalize text-foreground">{humanizeToken(item.name)}</div>
          <div className="text-[11px] text-muted-foreground">
            {item.timeframe_scope === "primary"
              ? "Used on the gate timeframe"
              : item.timeframe_scope === "secondary"
                ? "Used on the entry timeframe"
                : "Used on the selected timeframe"}
          </div>
        </div>
        <DetailStatusBadge passed={item.passed} />
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{plain}</p>

      {item.sticker ? (
        <div className="mt-3">
          <SignalBadge label={item.sticker} />
        </div>
      ) : null}

      {showTechnical ? <JsonBlock title="Indicator Config" value={item.config} /> : null}
      {showTechnical && evidence ? <JsonBlock title="Evidence" value={evidence} /> : null}
    </div>
  );
}

function FriendlyFilterCard({ item, showTechnical }: { item: FilterDetail; showTechnical: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold capitalize text-foreground">{humanizeToken(item.name)}</div>
          <div className="text-xs text-muted-foreground">{item.summary || "Extra screener rule."}</div>
        </div>
        <DetailStatusBadge passed={item.passed} />
      </div>

      {item.sticker ? (
        <div className="mt-3">
          <SignalBadge label={item.sticker} />
        </div>
      ) : null}

      {showTechnical ? <JsonBlock title="Filter Details" value={item.details} /> : null}
    </div>
  );
}

export function ResultDetailPanel({ result, detail, loading = false, error = "", onClose }: Props) {
  const showTechnical = appEnv.showTechnicalDetails;
  const { settings } = useUserSettings();
  const timeZone = settings.timezone || "UTC";
  const active = detail ?? result;
  const marketData = detail?.market_data;
  const lastCandleRecord = marketData?.last_candle;
  const lastCandleIsClosed = lastCandleRecord
    && typeof lastCandleRecord === "object"
    && "is_closed" in lastCandleRecord
    ? lastCandleRecord.is_closed !== false
    : null;
  const latestCandleConsidered = describeLatestCandleConsidered(active.last_candle_time ?? null, {
    timeZone,
    isClosed: lastCandleIsClosed,
  });
  const latestCandleHint = [
    latestCandleConsidered.timeLabel,
    latestCandleConsidered.utcLabel !== latestCandleConsidered.timeLabel
      ? `UTC ${latestCandleConsidered.utcLabel}`
      : null,
    latestCandleConsidered.statusLabel,
    "Compare this candle open time on TradingView",
  ].filter(Boolean).join(" • ");
  const reportDate = formatDateValue(active.report_date, timeZone);
  const indicatorDetails = detail?.indicator_details || [];
  const filterDetails = detail?.filter_details || [];
  const passedIndicators = indicatorDetails.filter((item) => item.passed);
  const failedIndicators = indicatorDetails.filter((item) => !item.passed);

  return (
    <div className="space-y-5 rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)_/_0.98),hsl(205_34%_12%_/_0.88))] p-5 shadow-[0_24px_80px_hsl(210_45%_3%_/_0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Selected stock / coin</div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold font-mono text-foreground">{active.symbol}</h3>
            <span className="rounded-full border border-border/70 bg-background/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {active.asset_type === "crypto" ? "Crypto" : "Stock"}
            </span>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-primary">
              {stageLabel(active.scan_stage)}
            </span>
            <span className="rounded-full border border-border/70 bg-background/35 px-2.5 py-1 text-[10px] text-foreground">
              {timeframeLabel(active.timeframe)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">{active.name || "Name unavailable"}</div>
        </div>
        <div className="flex items-start gap-2">
          {showTechnical ? (
            <CopyResultDetailButton
              result={result}
              detail={detail}
              loading={loading}
              error={error}
            />
          ) : null}
          <button onClick={onClose} className="rounded-full border border-border/70 p-2 text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/25 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Use this panel to see <span className="text-foreground">why</span> this symbol appeared (or did not).
        For LinReg Candles, compare the colored LinReg candle and white signal line values below with TradingView —
        hide normal candles so you do not mix them up.
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetaCard label="Latest price" value={formatPrice(active.price)} />
        <MetaCard
          label="Chart period"
          value={timeframeLabel(active.timeframe)}
          hint={stageLabel(active.scan_stage)}
        />
        <MetaCard
          label="Market / exchange"
          value={`${active.data_source}${active.exchange ? ` • ${active.exchange}` : ""}`}
        />
        <MetaCard
          label="Latest candle considered"
          value={latestCandleConsidered.dateLabel}
          hint={latestCandleHint}
        />
      </div>

      {showTechnical ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetaCard label="Candles loaded" value={String(active.candles_count ?? "N/A")} />
          <MetaCard label="CMC ID / Rank" value={`${active.cmc_id ?? "N/A"} / ${active.rank ?? "N/A"}`} />
          <MetaCard label="Report Date" value={reportDate} />
          <MetaCard label="Purification Ratio" value={active.purification_ratio?.toString() || "N/A"} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <MetaCard
            label="Category / compliance"
            value={active.category || active.compliance_status || "N/A"}
          />
          <MetaCard
            label="Candles used in scan"
            value={String(active.candles_count ?? "N/A")}
            hint="How many historical bars were available for this filter"
          />
        </div>
      )}

      {active.exchange_availability?.length ? (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Listed on</div>
          <div className="flex flex-wrap gap-1.5">
            {active.exchange_availability.map((exchange) => (
              <span key={exchange} className="rounded-full border border-border/70 bg-background/30 px-2.5 py-1 text-xs text-foreground">
                {exchange}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Why it matched</div>
        <div className="flex flex-wrap gap-1.5">
          {active.stickers.length > 0 ? (
            active.stickers.map((sticker, index) => (
              <SignalBadge key={`${active.symbol}-${sticker}-${index}`} label={sticker} />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No matched filter labels on this result.</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          Loading a clearer explanation for this asset...
        </div>
      )}

      {!!error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {detail && (
        <>
          {showTechnical ? (
            <div className="grid gap-4 md:grid-cols-3">
              <MetaCard label="Candle Provider" value={marketData?.candles_provider || "N/A"} />
              <MetaCard label="Next Refresh" value={formatUnixSeconds(marketData?.next_refresh_at)} />
              <MetaCard
                label="Shares / Float"
                value={`${formatNumber(marketData?.shares_outstanding)} / ${formatNumber(marketData?.float_shares)}`}
              />
            </div>
          ) : marketData?.candles_provider ? (
            <div className="rounded-2xl border border-border/50 bg-background/25 px-4 py-3 text-xs text-muted-foreground">
              Price data provider: <span className="text-foreground">{marketData.candles_provider}</span>
              {" "}(usually split/dividend adjusted). Tiny differences vs TradingView can still happen on edge cases.
            </div>
          ) : null}

          <ResultDetailChart
            key={`${active.symbol}-${active.timeframe}`}
            candles={marketData?.recent_candles || []}
            indicatorDetails={indicatorDetails}
            filterDetails={filterDetails}
            channels={detail.channels}
            confluenceChannels={detail.confluence_channels}
            requestFilters={detail.request_filters}
            symbol={active.symbol}
            timeframe={active.timeframe}
            timeZone={timeZone}
            provider={marketData?.candles_provider}
          />

          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Filter checks {passedIndicators.length || failedIndicators.length
                ? `(${passedIndicators.length} matched${failedIndicators.length ? `, ${failedIndicators.length} not matched` : ""})`
                : ""}
            </div>
            {indicatorDetails.length > 0 ? (
              <div className="grid gap-3">
                {indicatorDetails.map((item) => (
                  <FriendlyIndicatorCard
                    key={`${item.name}-${item.timeframe_scope}`}
                    item={item}
                    showTechnical={showTechnical}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-background/25 px-4 py-3 text-sm text-muted-foreground">
                No indicator filters were active for this scan.
              </div>
            )}
          </div>

          {(filterDetails.length > 0 || showTechnical) && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Other rules</div>
              {filterDetails.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {filterDetails.map((item) => (
                    <FriendlyFilterCard key={item.name} item={item} showTechnical={showTechnical} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-background/25 px-4 py-3 text-sm text-muted-foreground">
                  No extra rules (price range, dead assets, confluence, etc.) were returned.
                </div>
              )}
            </div>
          )}

          {showTechnical ? (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Developer data (VITE_SHOW_TECHNICAL_DETAILS=true)
              </div>
              <div className="grid gap-3">
                <JsonBlock title="Request Filters" value={detail.request_filters} defaultOpen />
                <JsonBlock title="Asset Metadata" value={detail.asset_metadata} />
                <JsonBlock title="Last Candle" value={marketData?.last_candle} />
                <JsonBlock title="Recent Candles" value={marketData?.recent_candles} />
                <JsonBlock title="Channels" value={detail.channels} />
                <JsonBlock title="Confluence Channels" value={detail.confluence_channels} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
