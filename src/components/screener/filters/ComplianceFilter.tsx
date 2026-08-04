import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ComplianceStatus } from "@/types/screener";

interface Props {
  status: ComplianceStatus | null;
  onStatusChange: (v: ComplianceStatus | null) => void;
}

const statuses: { label: string; value: ComplianceStatus }[] = [
  { label: "Compliant", value: "compliant" },
  { label: "Non-Compliant", value: "non-compliant" },
  { label: "Questionable", value: "questionable" },
];

const standards = [
  "AAOIFI",
  "Dow Jones Islamic",
  "MSCI Islamic",
  "MSCI Islamic Market",
  "S&P Shariah",
  "FTSE Shariah",
] as const;

export function ComplianceFilter({ status, onStatusChange }: Props) {
  const [standardsOpen, setStandardsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Compliance</label>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Status</div>
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatusChange(status === s.value ? null : s.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                status === s.value
                  ? "border-primary bg-primary/10 text-accent-foreground"
                  : "border-border bg-secondary/50 text-secondary-foreground hover:border-primary/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setStandardsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:border-primary/50"
          aria-expanded={standardsOpen}
          aria-controls="compliance-standards"
        >
          <span>Standards</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${standardsOpen ? "rotate-180" : ""}`}
          />
        </button>
        {standardsOpen && (
          <div id="compliance-standards" className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {standards.map((standard) => {
                const isSupported = standard === "AAOIFI";
                return (
                  <button
                    type="button"
                    key={standard}
                    disabled={!isSupported}
                    aria-disabled={!isSupported}
                    aria-pressed={isSupported}
                    title={
                      isSupported
                        ? "Active — all results are graded against the AAOIFI standard."
                        : "Disabled — our Zoya data plan currently only provides AAOIFI-based grading. This standard will turn on automatically once Zoya supports it."
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      isSupported
                        ? "border-primary bg-primary/10 text-accent-foreground cursor-default"
                        : "border-border bg-secondary/50 text-secondary-foreground opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {standard}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Only AAOIFI grading is available right now. The other standards are shown for
              reference and will activate automatically once our Zoya plan supports them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
