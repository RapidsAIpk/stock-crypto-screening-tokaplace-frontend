import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { formatClockTime } from "@/lib/dates";

export function AppClock() {
  const { settings } = useUserSettings();
  const timeZone = settings.timezone || "UTC";
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5"
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
