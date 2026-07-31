import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

export function FilterToggle({
  enabled,
  onToggle,
  label,
  info,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  info?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "h-5 w-5 shrink-0 rounded border transition-colors",
          enabled ? "border-primary bg-primary" : "border-border",
        )}
        aria-pressed={enabled}
      />
      <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {info ? <InfoTip content={info} side="right" /> : null}
    </div>
  );
}

export function FieldLabel({
  children,
  info,
  className,
}: {
  children: ReactNode;
  info?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span>{children}</span>
      {info ? <InfoTip content={info} side="right" /> : null}
    </div>
  );
}
