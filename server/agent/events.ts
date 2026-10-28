import { Temporal } from "temporal-polyfill";
import * as v from "valibot";
import { isDateString } from "#shared/dates";
import { expandEvents } from "#shared/occurrences";
import { listEventsInRange } from "../database/events";
import { listLookups } from "../database/lookups";
import { AgentError } from "./errors";

export const MAX_SEARCH_DAYS = 366;
export const MAX_SEARCH_RESULTS = 200;

const date = v.pipe(
  v.string("Required, as YYYY-MM-DD."),
  v.check(isDateString, "Must be a date as YYYY-MM-DD."),
);

function validRange(from: string, to: string): boolean {
  return isDateString(from) && isDateString(to);
}

// A range is required: without one every call would expand years of recurring events
export const eventSearchQuery = v.pipe(
  v.strictObject({
    from: date,
    to: date,
    q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100, "At most 100 characters."))),
    memberIds: v.optional(
      v.pipe(
        v.string(),
        v.transform((value) =>
          value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ),
    ),
  }),
  // Only judged once both are dates, a broken one already has its own issue
  v.forward(
    v.check(({ from, to }) => !validRange(from, to) || to >= from, "Must not be before from."),
    ["to"],
  ),
  v.forward(
    v.check(
      ({ from, to }) =>
        !validRange(from, to) ||
        Temporal.PlainDate.from(to).since(Temporal.PlainDate.from(from)).days < MAX_SEARCH_DAYS,
      `At most ${MAX_SEARCH_DAYS} days from from. Search in several ranges for more.`,
    ),
    ["to"],
  ),
);

export type EventSearchQuery = v.InferOutput<typeof eventSearchQuery>;

export interface AgentOccurrence {
  eventId: string;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
  recurring: boolean;
  members: { id: string; name: string }[];
  location: string;
  notes: string;
}

export async function searchOccurrences({ from, to, q, memberIds }: EventSearchQuery) {
  const [events, members] = await Promise.all([
    listEventsInRange(from, to),
    listLookups("members"),
  ]);
  const names = new Map(members.map((m) => [m.id, m.name]));

  const unknown = memberIds?.filter((id) => !names.has(id)) ?? [];
  if (unknown.length) {
    throw new AgentError(400, {
      code: "unknown_member",
      message: `Unknown member id: ${unknown.join(", ")}.`,
      hint: "Take member ids from GET /api/agent/members.",
    });
  }

  const needle = q?.toLocaleLowerCase("de");
  const matching = events.filter(
    (event) =>
      (!memberIds?.length || event.memberIds.some((id) => memberIds.includes(id))) &&
      (!needle ||
        [event.title, event.notes, event.location].some((text) =>
          text.toLocaleLowerCase("de").includes(needle),
        )),
  );
  const notes = new Map(matching.map((event) => [event.id, event.notes]));

  const occurrences = expandEvents(matching, from, to);
  return {
    from,
    to,
    total: occurrences.length,
    truncated: occurrences.length > MAX_SEARCH_RESULTS,
    occurrences: occurrences.slice(0, MAX_SEARCH_RESULTS).map((o): AgentOccurrence => ({
      eventId: o.eventId,
      title: o.title,
      allDay: o.allDay,
      start: o.start,
      end: o.end,
      recurring: o.recurring,
      members: o.memberIds.map((id) => ({ id, name: names.get(id) ?? "" })),
      location: o.location,
      notes: notes.get(o.eventId) ?? "",
    })),
  };
}
