import { Temporal } from "temporal-polyfill";

export const TIME_ZONE = "Europe/Berlin";

// Storage formats: all-day "2026-09-21", timed "2026-09-21T18:00" (local wall clock)
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  try {
    Temporal.PlainDate.from(value);
    return true;
  } catch {
    return false;
  }
}

export function isDateTimeString(value: string): boolean {
  if (!DATE_TIME_RE.test(value)) return false;
  try {
    Temporal.PlainDateTime.from(value);
    return true;
  } catch {
    return false;
  }
}

export function dateOf(value: string): string {
  return value.slice(0, 10);
}

export function toDateTimeString(value: Temporal.PlainDateTime): string {
  return value.toString({ smallestUnit: "minute" });
}

export function nowIso(): string {
  return Temporal.Now.instant().toString();
}

export function formatTime(dateTime: string): string {
  return dateTime.slice(11, 16);
}
