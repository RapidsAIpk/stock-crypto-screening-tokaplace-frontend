import { useEffect, useState } from "react";
import { FieldLabel } from "./FilterUi";

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-[16px] sm:text-sm text-foreground disabled:cursor-not-allowed";

interface PresetOrCustomProps {
  label: string;
  value: number | null;
  presets: number[];
  suffix?: string;
  disabled?: boolean;
  usedBy?: string;
  // When set, clearing the custom input is a valid end state: it commits null
  // (= "not set", the caller/back end falls back to its own default) instead
  // of snapping the field back to 0. Without it the client cannot delete the
  // last digit at all - blur re-renders the committed number over the blank.
  allowEmpty?: boolean;
  emptyLabel?: string;
  onChange: (v: number | null) => void;
}

export function PresetOrCustomField({
  label,
  value,
  presets,
  suffix,
  disabled = false,
  usedBy,
  allowEmpty = false,
  emptyLabel = "Any",
  onChange,
}: PresetOrCustomProps) {
  const matchesPreset = value !== null && presets.includes(value);
  const isUnset = value === null && allowEmpty;
  const [forceCustom, setForceCustom] = useState(!matchesPreset && !isUnset);
  const showCustom = forceCustom || (!matchesPreset && !isUnset);

  // Raw text typed into the custom input, tracked separately from the numeric
  // `value` prop. Previously onChange called `Number(e.target.value) || 0` on
  // every keystroke, which - combined with callers clamping to their own
  // minimum, e.g. `Math.max(1, v)` - made the field snap back to that floor
  // the instant it was cleared, before a replacement digit could be typed.
  // Typing is now free; the value only commits on blur.
  const [rawText, setRawText] = useState(value === null ? "" : String(value));

  useEffect(() => {
    setRawText(value === null ? "" : String(value));
  }, [value]);

  const commitRawText = () => {
    if (rawText.trim() === "") {
      // Empty resolves through 0 for callers that don't opt into null, so each
      // caller's own `Math.max` still lands it on the right floor.
      onChange(allowEmpty ? null : 0);
      return;
    }
    const parsed = Number(rawText);
    if (Number.isFinite(parsed)) {
      onChange(parsed);
    } else {
      setRawText(value === null ? "" : String(value));
    }
  };

  const selectValue = showCustom ? "custom" : value === null ? "" : String(value);

  return (
    <div className={`space-y-1.5 ${disabled ? "opacity-50" : ""}`}>
      <FieldLabel info={usedBy ? `Used by: ${usedBy}` : undefined}>{label}</FieldLabel>
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setForceCustom(true);
            return;
          }
          if (allowEmpty && e.target.value === "") {
            setForceCustom(false);
            onChange(null);
            return;
          }
          setForceCustom(false);
          onChange(Number(e.target.value));
        }}
        className={inputClass}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
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
          value={rawText}
          disabled={disabled}
          onChange={(e) => setRawText(e.target.value)}
          onBlur={commitRawText}
          className={inputClass}
          placeholder={allowEmpty ? "Leave blank for default" : "Custom value"}
        />
      )}
    </div>
  );
}
