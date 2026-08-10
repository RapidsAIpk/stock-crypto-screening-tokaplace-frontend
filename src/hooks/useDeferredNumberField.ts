import { useEffect, useState, type ChangeEvent } from "react";

// Tracks the raw text typed into a number input separately from the
// committed numeric value. Binding a number input's `value` directly to
// state and calling `Number(e.target.value) || fallback` on every keystroke
// makes the field snap back to `fallback` the instant it's cleared, before a
// replacement digit can be typed - see PresetOrCustomField.tsx for the
// original fix this generalizes. Typing stays free; the value only commits
// (and clamps, if the caller's onCommit does that) on blur.
export function useDeferredNumberField(value: number, onCommit: (parsed: number) => void) {
  const [rawText, setRawText] = useState(String(value));

  useEffect(() => {
    setRawText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = rawText.trim() === "" ? 0 : Number(rawText);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
    } else {
      setRawText(String(value));
    }
  };

  return {
    rawText,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setRawText(e.target.value),
    onBlur: commit,
  };
}
