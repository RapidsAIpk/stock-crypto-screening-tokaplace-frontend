import { Activity, Radio } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScanProgressState } from "@/types/screener";

interface Props {
  progress: ScanProgressState;
}

const STAGE_LABELS: Record<string, string> = {
  started: "Starting",
  building_universe: "Building universe",
  fetching_market_data: "Fetching market data",
  price_range: "Price range filter",
  dead_assets: "Dead assets filter",
  adr: "Average daily range filter",
  indicators: "Evaluating indicators",
  channel_respect: "Channel respect",
  confluence: "Confluence",
  post_filters: "Post filters",
  completed: "Completed",
};

function formatStage(stage: string | null): string {
  if (!stage) {
    return "Preparing";
  }
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

export function ScanProgressPanel({ progress }: Props) {
  const percent = progress.current !== null && progress.total
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 rounded-[24px] border border-border/70 bg-card/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Scanning markets</p>
            <p className="text-xs text-muted-foreground break-words">{progress.message}</p>
          </div>
        </div>

        <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${
          progress.connected
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-border/70 bg-secondary/50 text-muted-foreground"
        }`}>
          <Radio className="h-3 w-3" />
          {progress.connected ? "Live" : "Connecting"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-foreground">
          {formatStage(progress.stage)}
        </span>
        {progress.detail && (
          <span className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-mono text-muted-foreground">
            {progress.detail}
          </span>
        )}
        {progress.symbol && (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-mono text-primary">
            {progress.symbol}
          </span>
        )}
      </div>

      {percent !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Progress</span>
            <span>
              {progress.current}/{progress.total} ({percent}%)
            </span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      )}

      {progress.log.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background/40">
          <div className="border-b border-border/60 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Pipeline activity
          </div>
          <ScrollArea className="h-40">
            <div className="space-y-1 p-3 font-mono text-xs">
              {progress.log.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className="flex flex-col gap-0.5 text-muted-foreground sm:flex-row sm:items-start sm:gap-2"
                >
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-primary/80">
                    {formatStage(entry.stage)}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-foreground/85">
                    {entry.symbol ? `${entry.symbol} · ` : ""}
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
