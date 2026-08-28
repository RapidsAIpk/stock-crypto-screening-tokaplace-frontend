import { useEffect, useState } from "react";

interface Props {
  value: number | null | undefined;
  fallback: number;
  min?: number;
  step?: number;
  className?: string;
  onCommit: (value: number) => void;
}

/**
 * A number input that can actually be emptied while typing (M3-ISS-01).
 *
 * Binding a number straight to `value` and calling `Number(e.target.value)` on
 * every keystroke makes the field impossible to clear: deleting the last digit
 * yields `Number("") === 0`, which is written straight back as "0". This keeps
 * the typed text uncommitted until blur, so a field can be blanked and retyped
 * freely, and only resolves to a real number when focus leaves.
 */
export function ClearableNumberInput({
  value,
  fallback,
  min = 0,
  step,
  className,
  onCommit,
}: Props) {
  const [rawText, setRawText] = useState(String(value ?? fallback));

  useEffect(() => {
    setRawText(String(value ?? fallback));
  }, [fallback, value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    // Left blank on purpose: fall back to this field's own default rather than
    // silently pinning it to 0.
    const parsed = trimmed === "" ? fallback : Number(trimmed);
    const next = Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
    setRawText(String(next));
    onCommit(next);
  };

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={rawText}
      onChange={(event) => setRawText(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      className={className}
    />
  );
}
