import { useCallback, useState } from "react";
import { Check, ClipboardCopy, Loader2 } from "lucide-react";
import type { ScreenerResultsBulkExport } from "@/types/screener";
import { copyOrDownloadLargeJson } from "@/lib/copyText";

interface Props {
  resultCount: number;
  onExportAllDetails: (
    onProgress?: (loaded: number, total: number) => void,
  ) => Promise<ScreenerResultsBulkExport>;
  variant?: "sidebar" | "toolbar";
}

export function CopyAllStocksDetailsButton({
  resultCount,
  onExportAllDetails,
  variant = "sidebar",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [done, setDone] = useState<"clipboard" | "download" | null>(null);
  const [error, setError] = useState("");

  const handleCopy = useCallback(async () => {
    if (!resultCount || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setDone(null);
    setProgress({ loaded: 0, total: resultCount });

    try {
      const payload = await onExportAllDetails((loaded, total) => {
        setProgress({ loaded, total });
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const mode = await copyOrDownloadLargeJson(payload, `screener-results-${stamp}.json`);
      setDone(mode);
      window.setTimeout(() => setDone(null), 3000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Failed to export result details.");
      window.setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [loading, onExportAllDetails, resultCount]);

  const label = loading && progress
    ? `Loading details ${progress.loaded}/${progress.total}`
    : done === "download"
      ? "Downloaded JSON file"
      : done === "clipboard"
        ? "Copied all stocks"
        : "Copy all stocks (full JSON)";

  const className = variant === "toolbar"
    ? "inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCopy}
        disabled={loading || resultCount === 0}
        title="Fetch full A–Z detail for every scan result, then copy or download JSON"
        className={className}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <ClipboardCopy className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
      {variant === "sidebar" ? (
        <p className="text-[10px] leading-4 text-muted-foreground">
          Loads each result&apos;s full detail panel data (indicators, candles, metadata). Large scans may take time; huge exports auto-download instead of clipboard.
        </p>
      ) : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
