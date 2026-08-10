import { ArrowRight, Loader2, Play, Square } from "lucide-react";
import type { useScreener } from "@/hooks/useScreener";

type ScreenerState = ReturnType<typeof useScreener>;

export function RunControls({ state }: { state: ScreenerState }) {
  const { timeframeMode, loading, gateCompleted, runSingle, runGate, runEntry, cancelScan } = state;

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/50 p-1.5 backdrop-blur-sm">
      {timeframeMode === "single" ? (
        <button
          onClick={runSingle}
          disabled={loading}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_hsl(var(--primary)_/_0.3)] transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Scan
        </button>
      ) : (
        <>
          <button
            onClick={runGate}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_hsl(var(--primary)_/_0.3)] transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run Gate
          </button>
          <button
            onClick={runEntry}
            disabled={loading || !gateCompleted}
            title={!gateCompleted ? "Run Gate first" : undefined}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_hsl(var(--primary)_/_0.3)] transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Run Entry
          </button>
        </>
      )}
      {loading && (
        <button
          onClick={cancelScan}
          className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-[0_12px_32px_hsl(var(--destructive)_/_0.3)] transition-colors hover:bg-destructive/90"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>
      )}
    </div>
  );
}
