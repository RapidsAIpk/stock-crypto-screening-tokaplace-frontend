import type { StockFilterOption } from "@/types/screener";

interface Props {
  options: StockFilterOption[];
  loading?: boolean;
  selected: string[];
  onChange: (values: string[]) => void;
}

export function AssetCategoryFilter({
  options,
  loading = false,
  selected,
  onChange,
}: Props) {
  const normalizedSelected = Array.from(
    new Set(
      selected
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const toggleCategory = (categoryId: string) => {
    const normalized = categoryId.toLowerCase();
    if (normalizedSelected.includes(normalized)) {
      onChange(normalizedSelected.filter((value) => value !== normalized));
      return;
    }
    onChange([...normalizedSelected, normalized]);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Asset Category
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = normalizedSelected.includes(option.id.toLowerCase());
          return (
            <button
              key={option.id}
              type="button"
              disabled={loading}
              onClick={() => toggleCategory(option.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                active
                  ? "border-primary bg-primary/10 text-accent-foreground"
                  : "border-border bg-secondary/50 text-secondary-foreground hover:border-primary/50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {normalizedSelected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear categories
        </button>
      )}
    </div>
  );
}
