import { Temporal } from "temporal-polyfill";

export const TIME_ZONE = "Europe/Vienna";

// Header labels, Monday first. Matches the grid order below.
export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export interface GridDay {
  date: Temporal.PlainDate;
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function today(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO(TIME_ZONE);
}

// Formatted via PlainDate: PlainYearMonth.toLocaleString rejects locales whose default calendar is not iso8601.
export function formatMonth(month: Temporal.PlainYearMonth): string {
  return month.toPlainDate({ day: 1 }).toLocaleString("de-AT", { month: "long", year: "numeric" });
}

// Builds the visible grid for a month: whole weeks starting on Monday, padded with
// neighbouring days. Always at least 5 rows so the layout does not jump between months.
export function monthGrid(month: Temporal.PlainYearMonth): GridDay[] {
  const first = month.toPlainDate({ day: 1 });
  const leading = first.dayOfWeek - 1;
  const rows = Math.max(5, Math.ceil((leading + month.daysInMonth) / 7));
  const start = first.subtract({ days: leading });
  const now = today();

  return Array.from({ length: rows * 7 }, (_, i) => {
    const date = start.add({ days: i });
    return {
      date,
      iso: date.toString(),
      day: date.day,
      inMonth: date.month === month.month && date.year === month.year,
      isToday: date.equals(now),
      isWeekend: date.dayOfWeek >= 6,
    };
  });
}
