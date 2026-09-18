import { Temporal } from "temporal-polyfill";

export const REPEAT_OPTIONS = ["none", "daily", "weekly", "monthly", "yearly"] as const;
export type Repeat = (typeof REPEAT_OPTIONS)[number];

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

// Explicit BY parts so month ends and leap days are skipped instead of drifting
export function buildRrule(repeat: Repeat, startDate: string, until: string | null): string | null {
  if (repeat === "none") return null;
  const start = Temporal.PlainDate.from(startDate);
  const parts: string[] = [];
  switch (repeat) {
    case "daily":
      parts.push("FREQ=DAILY");
      break;
    case "weekly":
      parts.push("FREQ=WEEKLY", `BYDAY=${WEEKDAYS[start.dayOfWeek - 1]}`);
      break;
    case "monthly":
      parts.push("FREQ=MONTHLY", `BYMONTHDAY=${start.day}`);
      break;
    case "yearly":
      parts.push("FREQ=YEARLY", `BYMONTH=${start.month}`, `BYMONTHDAY=${start.day}`);
      break;
  }
  // UNTIL as a date-only value ends the series after that day, in the event's own time zone
  if (until) parts.push(`UNTIL=${until.replaceAll("-", "")}`);
  return parts.join(";");
}

// Inverse of buildRrule. Anything it did not generate comes back as `custom` and is kept as is.
export function parseRrule(rrule: string | null): {
  repeat: Repeat | "custom";
  until: string | null;
} {
  if (!rrule) return { repeat: "none", until: null };
  const parts = Object.fromEntries(
    rrule.split(";").map((part) => part.split("=") as [string, string]),
  );
  const untilRaw = parts.UNTIL;
  const until =
    untilRaw && /^\d{8}$/.test(untilRaw)
      ? `${untilRaw.slice(0, 4)}-${untilRaw.slice(4, 6)}-${untilRaw.slice(6, 8)}`
      : null;
  const known = new Set(["FREQ", "BYDAY", "BYMONTHDAY", "BYMONTH", "UNTIL"]);
  const unknownPart = Object.keys(parts).some((key) => !known.has(key));
  const multiValue = Object.values(parts).some((value) => value.includes(","));
  if (unknownPart || multiValue || (untilRaw && !until)) return { repeat: "custom", until: null };
  const freq = parts.FREQ;
  const repeat =
    freq === "DAILY"
      ? "daily"
      : freq === "WEEKLY"
        ? "weekly"
        : freq === "MONTHLY"
          ? "monthly"
          : freq === "YEARLY"
            ? "yearly"
            : "custom";
  return { repeat, until };
}
