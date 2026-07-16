import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { useUserSettings, type WatchlistEntry } from "@/hooks/useUserSettings";
import type { AssetType } from "@/types/screener";

function WatchlistRow({
  entry,
  onUpdateNote,
  onRemove,
}: {
  entry: WatchlistEntry;
  onUpdateNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
}) {
  const [note, setNote] = useState(entry.note ?? "");

  return (
    <div className="flex items-center gap-3 rounded border border-border/70 p-3">
      <div className="w-20 shrink-0">
        <div className="font-mono text-sm text-foreground">{entry.symbol}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{entry.assetType}</div>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note !== (entry.note ?? "")) onUpdateNote(entry.id, note);
        }}
        placeholder="Add a note..."
        className="flex-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs"
      />
      <button
        onClick={() => onRemove(entry.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        aria-label={`Remove ${entry.symbol}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function WatchlistPage() {
  const { settings, loading, addWatchlistEntry, updateWatchlistEntry, removeWatchlistEntry } = useUserSettings();
  const [symbolInput, setSymbolInput] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stocks");
  const [noteInput, setNoteInput] = useState("");

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground animate-pulse">Loading watchlist...</p>
      </div>
    );
  }

  const handleAdd = () => {
    const symbol = symbolInput.trim().toUpperCase();
    if (!symbol) return;
    if (settings.watchlist.some((entry) => entry.symbol.toLowerCase() === symbol.toLowerCase())) {
      setSymbolInput("");
      setNoteInput("");
      return;
    }
    addWatchlistEntry(symbol, assetType, noteInput);
    setSymbolInput("");
    setNoteInput("");
  };

  const sorted = [...settings.watchlist].sort((a, b) => b.addedAt - a.addedAt);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Watchlist</h1>
      <p className="text-sm text-muted-foreground">
        Add stocks and crypto to keep track of, independent of any scan. Stars in the scan results table add and
        remove entries here too.
      </p>

      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add to Watchlist</h2>
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Symbol</label>
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="AAPL"
              className="w-32 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="flex gap-1">
              {(["stocks", "crypto"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setAssetType(type)}
                  className={`rounded-md border px-3 py-2 text-xs capitalize transition-colors ${
                    assetType === type
                      ? "border-primary bg-primary/10 text-accent-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Note (optional)</label>
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="Why you're watching this"
              className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!symbolInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Star className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your Watchlist ({sorted.length})
        </h2>
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing here yet. Add a symbol above or star one from your scan results.</p>
        )}
        <div className="space-y-2">
          {sorted.map((entry) => (
            <WatchlistRow
              key={entry.id}
              entry={entry}
              onUpdateNote={(id, note) => updateWatchlistEntry(id, { note })}
              onRemove={removeWatchlistEntry}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
