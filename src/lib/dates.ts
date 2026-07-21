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
