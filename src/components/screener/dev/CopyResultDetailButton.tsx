import { useCallback, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import type { ScreenerResult, ScreenerResultDetail } from "@/types/screener";
import { copyOrDownloadLargeJson } from "@/lib/copyText";

interface Props {
  result: ScreenerResult;
  detail?: ScreenerResultDetail | null;
  loading?: boolean;
  error?: string;
}

export function CopyResultDetailButton({
  result,
  detail = null,
  loading = false,
  error = "",
}: Props) {
  const [copied, setCopied] = useState<"clipboard" | "download" | null>(null);
  const [copyError, setCopyError] = useState("");

  const handleCopy = useCallback(async () => {
    setCopyError("");

    try {
      const payload = {
        exported_at: new Date().toISOString(),
        symbol: result.symbol,
        asset_type: result.asset_type,
        timeframe: result.timeframe,
        scan_stage: result.scan_stage ?? null,
        loading,
        error: error || null,
        summary: result,
        detail,
      };

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeSymbol = result.symbol.replace(/[^\w.-]+/g, "_");
      const mode = await copyOrDownloadLargeJson(
        payload,
        `screener-detail-${safeSymbol}-${stamp}.json`,
      );
      setCopied(mode);
      window.setTimeout(() => setCopied(null), 2500);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : "Failed to copy result detail JSON.");
      window.setTimeout(() => setCopyError(""), 5000);
    }
  }, [detail, error, loading, result]);

  const label = copied === "download"
    ? "Downloaded JSON"
    : copied === "clipboard"
      ? "Copied JSON"
      : "Copy detail JSON";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleCopy}
        disabled={loading}
        title="Copy this symbol's summary and detail panel data as JSON"
        className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
        {label}
      </button>
      {copyError ? <p className="text-[10px] text-destructive">{copyError}</p> : null}
    </div>
  );
}
