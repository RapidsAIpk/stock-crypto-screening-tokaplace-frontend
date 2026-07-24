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

  // Raw text typed into the custom input, tracked separately from the numeric
  // `value` prop. Previously onChange called `Number(e.target.value) || 0` on
  // every keystroke, which - combined with callers clamping to their own
  // minimum, e.g. `Math.max(1, v)` - made the field snap back to that floor
  // the instant it was cleared, before a replacement digit could be typed.
  // Typing is now free; the value only commits on blur, same as before
  // (empty still resolves through 0, so each caller's own `Math.max` still
  // lands it on the right floor - it just doesn't fire on every keystroke).
  const [rawText, setRawText] = useState(String(value));

  useEffect(() => {
    setRawText(String(value));
  }, [value]);

  const commitRawText = () => {
    const parsed = rawText.trim() === "" ? 0 : Number(rawText);
    if (Number.isFinite(parsed)) {
      onChange(parsed);
    } else {
      setRawText(String(value));
    }
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
          value={rawText}
          disabled={disabled}
          onChange={(e) => setRawText(e.target.value)}
          onBlur={commitRawText}
          className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed"
          placeholder="Custom value"
        />
      )}
    </div>
  );
}
