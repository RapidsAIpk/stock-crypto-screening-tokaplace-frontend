import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { formatClockTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

const LOCAL_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function AppClock({ className }: { className?: string }) {
  const { settings } = useUserSettings();
  const timeZone = settings.nyTimeOverride ? "America/New_York" : LOCAL_TIME_ZONE;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={cn("flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5", className)}
      title={`App timezone: ${timeZone}`}
    >
      <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="text-xs font-mono leading-tight">
        <div className="text-foreground">{formatClockTime(now, timeZone)}</div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{timeZone}</div>
      </div>
    </div>
  );
}
