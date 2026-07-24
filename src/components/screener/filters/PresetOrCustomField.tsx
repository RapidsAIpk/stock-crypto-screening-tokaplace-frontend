import { useEffect, useState } from "react";

interface PresetOrCustomProps {
  label: string;
  value: number;
  presets: number[];
  suffix?: string;
  disabled?: boolean;
  usedBy?: string;
  onChange: (v: number) => void;
}

export function PresetOrCustomField({
  label,
  value,
  presets,
  suffix,
  disabled = false,
  usedBy,
  onChange,
}: PresetOrCustomProps) {
  const matchesPreset = presets.includes(value);
  const [forceCustom, setForceCustom] = useState(!matchesPreset);
  const showCustom = forceCustom || !matchesPreset;
  const [customDraft, setCustomDraft] = useState(String(value));

  useEffect(() => {
    if (showCustom) {
      setCustomDraft(String(value));
    }
  }, [value, showCustom]);

  const commitCustomDraft = () => {
    const parsed = Number(customDraft);
    if (customDraft.trim() === "" || !Number.isFinite(parsed)) {
      setCustomDraft(String(value));
      return;
    }
    onChange(parsed);
    setCustomDraft(String(parsed));
  };

  return (
    <div className={`space-y-1 ${disabled ? "opacity-50" : ""}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      {usedBy ? (
        <p className="text-[9px] leading-3 text-muted-foreground/80">Used by: {usedBy}</p>
      ) : null}
      <select
        value={showCustom ? "custom" : String(value)}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setForceCustom(true);
            setCustomDraft(String(value));
            return;
          }
          setForceCustom(false);
          onChange(Number(e.target.value));
        }}
        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed"
      >
        {presets.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
            {suffix ?? ""}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {showCustom && (
        <input
          type="number"
          value={customDraft}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setCustomDraft(next);
            if (next === "" || next === "-") {
              return;
            }
            const parsed = Number(next);
            if (Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={commitCustomDraft}
          className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed"
          placeholder="Custom value"
        />
      )}
    </div>
  );
}
