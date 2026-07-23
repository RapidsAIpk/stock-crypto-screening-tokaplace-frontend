import { useState } from "react";

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
          min="0"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed"
          placeholder="Custom value"
        />
      )}
    </div>
  );
}
