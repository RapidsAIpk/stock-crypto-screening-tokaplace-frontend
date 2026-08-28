export const DEFAULT_APP_TIMEZONE = "UTC";

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

const CLOCK_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

export function formatDateTime(date: Date, timeZone = DEFAULT_APP_TIMEZONE): string {
  return date.toLocaleString("en-US", { ...DATE_TIME_OPTIONS, timeZone });
}

export function formatClockTime(date: Date, timeZone = DEFAULT_APP_TIMEZONE): string {
  return date.toLocaleTimeString("en-US", { ...CLOCK_TIME_OPTIONS, timeZone });
}

export function formatUnixSeconds(
  value: number | null | undefined,
  timeZone = DEFAULT_APP_TIMEZONE,
): string {
  if (!value && value !== 0) {
    return "N/A";
  }

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return formatDateTime(date, timeZone);
}

export function formatDateValue(
  value: unknown,
  timeZone = DEFAULT_APP_TIMEZONE,
): string {
  if (!value) {
    return "N/A";
  }

  if (typeof value === "number") {
    return formatUnixSeconds(value, timeZone);
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatDateTime(date, timeZone);
}

export interface LatestCandleConsidered {
  dateLabel: string;
  timeLabel: string;
  utcLabel: string;
  statusLabel: string | null;
}

export function describeLatestCandleConsidered(
  lastCandleTime: number | null | undefined,
  options?: {
    timeZone?: string;
    isClosed?: boolean | null;
  },
): LatestCandleConsidered {
  const timeZone = options?.timeZone ?? DEFAULT_APP_TIMEZONE;

  // A non-positive timestamp is a placeholder, not a real candle time -
  // rendering it would print "Dec 31, 1969" (the unix epoch in local time)
  // rather than telling the reader the candle time is unknown.
  if (lastCandleTime === null || lastCandleTime === undefined || lastCandleTime <= 0) {
    return {
      dateLabel: "N/A",
      timeLabel: "",
      utcLabel: "",
      statusLabel: null,
    };
  }

  const date = new Date(lastCandleTime * 1000);
  if (Number.isNaN(date.getTime())) {
    return {
      dateLabel: "N/A",
      timeLabel: "",
      utcLabel: "",
      statusLabel: null,
    };
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  });
  const timeLabel = formatDateTime(date, timeZone);
  const utcLabel = formatDateTime(date, "UTC");
  const statusLabel = options?.isClosed === false
    ? "Still forming"
    : options?.isClosed === true
      ? "Marked closed"
      : null;

  return {
    dateLabel,
    timeLabel,
    utcLabel,
    statusLabel,
  };
}
