interface Props {
  options: string[];
  loading?: boolean;
  selected: string[];
  onChange: (values: string[]) => void;
}

export function SectorFilter({
  options,
  loading = false,
  selected,
  onChange,
}: Props) {
  const normalizedSelected = Array.from(
    new Set(
      selected
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  const toggleSector = (sector: string) => {
    if (normalizedSelected.includes(sector)) {
      onChange(normalizedSelected.filter((value) => value !== sector));
      return;
    }
    onChange([...normalizedSelected, sector]);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Sector
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((sector) => {
          const active = normalizedSelected.includes(sector);
          return (
            <button
              key={sector}
              type="button"
              disabled={loading}
              onClick={() => toggleSector(sector)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                active
                  ? "border-primary bg-primary/10 text-accent-foreground"
                  : "border-border bg-secondary/50 text-secondary-foreground hover:border-primary/50"
              }`}
            >
              {sector}
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
          Clear sectors
        </button>
      )}
    </div>
  );
}
