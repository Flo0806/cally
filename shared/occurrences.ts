import { Temporal } from "temporal-polyfill";
import { RRuleTemporal } from "rrule-temporal";
import type { CalendarEvent, Occurrence } from "./types";
import { TIME_ZONE, dateOf, toDateTimeString } from "./dates";

export function isValidRrule(rrule: string): boolean {
  try {
    new RRuleTemporal({
      rruleString: rrule,
      dtstart: Temporal.Now.zonedDateTimeISO(TIME_ZONE),
      tzid: TIME_ZONE,
    });
    return true;
  } catch {
    return false;
  }
}

function toOccurrence(
  event: CalendarEvent,
  start: string,
  end: string,
  recurring: boolean,
): Occurrence {
  return {
    key: `${event.id}:${start}`,
    eventId: event.id,
    title: event.title,
    allDay: event.allDay,
    start,
    end,
    categoryId: event.categoryId,
    memberIds: event.memberIds,
    recurring,
  };
}

function overlaps(start: string, end: string, from: string, to: string): boolean {
  return dateOf(start) <= to && dateOf(end) >= from;
}

// Instances of one event that touch the inclusive date range [from, to]
export function expandEvent(event: CalendarEvent, from: string, to: string): Occurrence[] {
  if (!event.rrule) {
    return overlaps(event.start, event.end, from, to)
      ? [toOccurrence(event, event.start, event.end, false)]
      : [];
  }

  const spanDays = Temporal.PlainDate.from(dateOf(event.end)).since(
    Temporal.PlainDate.from(dateOf(event.start)),
  ).days;
  const duration = event.allDay
    ? Temporal.Duration.from({ days: spanDays })
    : Temporal.PlainDateTime.from(event.end).since(Temporal.PlainDateTime.from(event.start));

  const dtstart = event.allDay
    ? Temporal.PlainDate.from(event.start).toZonedDateTime(TIME_ZONE)
    : Temporal.PlainDateTime.from(event.start).toZonedDateTime(TIME_ZONE);
  const rule = new RRuleTemporal({ rruleString: event.rrule, dtstart, tzid: TIME_ZONE });

  // Widen the window by the event length so instances starting before `from` but still running are found
  const after = Temporal.PlainDate.from(from)
    .subtract({ days: spanDays })
    .toZonedDateTime(TIME_ZONE);
  const before = Temporal.PlainDate.from(to).add({ days: 1 }).toZonedDateTime(TIME_ZONE);

  const result: Occurrence[] = [];
  for (const instance of rule.between(after, before, true)) {
    const start = event.allDay
      ? instance.toPlainDate().toString()
      : toDateTimeString(instance.toPlainDateTime());
    if (event.exdates.includes(start)) continue;
    const end = event.allDay
      ? instance.toPlainDate().add(duration).toString()
      : toDateTimeString(instance.toPlainDateTime().add(duration));
    if (!overlaps(start, end, from, to)) continue;
    result.push(toOccurrence(event, start, end, true));
  }
  return result;
}

export function expandEvents(events: CalendarEvent[], from: string, to: string): Occurrence[] {
  return events
    .flatMap((event) => expandEvent(event, from, to))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}
