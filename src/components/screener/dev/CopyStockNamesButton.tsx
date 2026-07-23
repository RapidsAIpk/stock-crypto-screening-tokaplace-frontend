import { useCallback, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { copyTextToClipboard } from "@/lib/copyText";

interface Props {
  symbols: string[];
  variant?: "sidebar" | "toolbar";
}

export function CopyStockNamesButton({ symbols, variant = "sidebar" }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleCopy = useCallback(async () => {
    if (!symbols.length) {
      return;
    }

    setError("");

    try {
      await copyTextToClipboard(symbols.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Failed to copy stock names.");
      window.setTimeout(() => setError(""), 5000);
    }
  }, [symbols]);

  const label = copied ? "Copied stock names" : "Copy stock names";

  const className = variant === "toolbar"
    ? "inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCopy}
        disabled={symbols.length === 0}
        title="Copy ticker symbols from the current scan, one per line"
        className={className}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
        {label}
      </button>
      {variant === "sidebar" ? (
        <p className="text-[10px] leading-4 text-muted-foreground">
          Copies only the listed ticker symbols from the latest scan — no prices, indicators, or JSON.
        </p>
      ) : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
