import { Temporal } from "temporal-polyfill";
import * as v from "valibot";
import { isDateString, isDateTimeString, toDateTimeString } from "#shared/dates";
import { expandEvents } from "#shared/occurrences";
import type { CalendarEvent } from "#shared/types";
import { createEvent, getEvent, listEventsInRange } from "../database/events";
import { listLookups } from "../database/lookups";
import type { AgentContext } from "./door";
import { AgentError } from "./errors";

export const MAX_SEARCH_DAYS = 366;
export const MAX_SEARCH_RESULTS = 200;

const sourceRef = v.pipe(
  v.string("Must be a string."),
  v.trim(),
  v.minLength(1, "Must not be empty."),
  v.maxLength(300, "At most 300 characters."),
);

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
    sourceRef: v.optional(sourceRef),
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

export interface AgentEvent {
  eventId: string;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
  recurring: boolean;
  members: { id: string; name: string }[];
  location: string;
  notes: string;
  sourceRef: string | null;
  createdByYou: boolean;
}

// The one shape an agent sees an event in, from search, lookup and create alike
function toAgentEvent(
  event: CalendarEvent,
  names: Map<string, string>,
  agent: AgentContext,
): AgentEvent {
  return {
    eventId: event.id,
    title: event.title,
    allDay: event.allDay,
    start: event.start,
    end: event.end,
    recurring: event.rrule !== null,
    members: event.memberIds.map((id) => ({ id, name: names.get(id) ?? "" })),
    location: event.location,
    notes: event.notes,
    sourceRef: event.sourceRef,
    createdByYou: event.agentKeyId === agent.id,
  };
}

// Names by id, and the check that every id the agent sent exists
async function memberNames(ids: string[] = []): Promise<Map<string, string>> {
  const members = await listLookups("members");
  const names = new Map(members.map((m) => [m.id, m.name]));
  const unknown = ids.filter((id) => !names.has(id));
  if (unknown.length) {
    throw new AgentError(400, {
      code: "unknown_member",
      message: `Unknown member id: ${unknown.join(", ")}.`,
      hint: "Take member ids from GET /api/agent/members.",
    });
  }
  return names;
}

export async function searchOccurrences(
  { from, to, q, memberIds, sourceRef }: EventSearchQuery,
  agent: AgentContext,
) {
  const [events, names] = await Promise.all([listEventsInRange(from, to), memberNames(memberIds)]);

  const needle = q?.toLocaleLowerCase("de");
  const matching = events.filter(
    (event) =>
      (!memberIds?.length || event.memberIds.some((id) => memberIds.includes(id))) &&
      (!needle ||
        [event.title, event.notes, event.location].some((text) =>
          text.toLocaleLowerCase("de").includes(needle),
        )) &&
      (!sourceRef || event.sourceRef === sourceRef),
  );
  const byId = new Map(matching.map((event) => [event.id, event]));

  const occurrences = expandEvents(matching, from, to);
  return {
    from,
    to,
    total: occurrences.length,
    truncated: occurrences.length > MAX_SEARCH_RESULTS,
    // A recurring event shows once per date, with that date's start and end
    occurrences: occurrences.slice(0, MAX_SEARCH_RESULTS).map((o) => ({
      ...toAgentEvent(byId.get(o.eventId)!, names, agent),
      start: o.start,
      end: o.end,
    })),
  };
}

const DEFAULT_TIMED_HOURS = 1;

function validStart(allDay: boolean, value: string): boolean {
  return allDay ? isDateString(value) : isDateTimeString(value);
}

// The agent's own body, mapped onto the app's event in `createAgentEvent`. Location, repeat and
// category are left out: a location needs coordinates the agent cannot resolve.
export const eventCreateBody = v.pipe(
  v.strictObject({
    title: v.pipe(
      v.string("Must be a string."),
      v.trim(),
      v.minLength(1, "Must not be empty."),
      v.maxLength(120, "At most 120 characters."),
    ),
    allDay: v.boolean("Must be true or false."),
    start: v.string("Must be a string."),
    end: v.optional(v.string("Must be a string.")),
    memberIds: v.pipe(
      v.array(v.string(), "Must be an array of member ids."),
      v.minLength(1, "At least one member id."),
    ),
    notes: v.optional(
      v.pipe(
        v.string("Must be a string."),
        v.trim(),
        v.maxLength(2000, "At most 2000 characters."),
      ),
      "",
    ),
    sourceRef: v.optional(sourceRef),
  }),
  v.forward(
    v.check(
      ({ allDay, start }) => validStart(allDay, start),
      "Must be YYYY-MM-DD for an all-day event, YYYY-MM-DDTHH:mm otherwise.",
    ),
    ["start"],
  ),
  v.forward(
    v.check(
      ({ allDay, end }) => end === undefined || validStart(allDay, end),
      "Must be YYYY-MM-DD for an all-day event, YYYY-MM-DDTHH:mm otherwise.",
    ),
    ["end"],
  ),
  v.forward(
    v.check(
      ({ allDay, start, end }) =>
        end === undefined || !validStart(allDay, start) || !validStart(allDay, end) || end >= start,
      "Must not be before start.",
    ),
    ["end"],
  ),
);

export type EventCreateBody = v.InferOutput<typeof eventCreateBody>;

export async function getAgentEvent(id: string, agent: AgentContext): Promise<AgentEvent> {
  const [event, names] = await Promise.all([
    getEvent(id).catch((error: { statusCode?: number }) => {
      if (error.statusCode !== 404) throw error;
      throw new AgentError(404, {
        code: "not_found",
        message: `There is no event with id ${id}.`,
        hint: "Take event ids from GET /api/agent/events.",
      });
    }),
    memberNames(),
  ]);
  return toAgentEvent(event, names, agent);
}

export async function createAgentEvent(body: EventCreateBody, agent: AgentContext) {
  const names = await memberNames(body.memberIds);
  const end =
    body.end ??
    (body.allDay
      ? body.start
      : toDateTimeString(
          Temporal.PlainDateTime.from(body.start).add({ hours: DEFAULT_TIMED_HOURS }),
        ));

  const created = await createEvent(
    {
      title: body.title,
      notes: body.notes,
      allDay: body.allDay,
      start: body.start,
      end,
      rrule: null,
      exdates: [],
      categoryId: null,
      memberIds: body.memberIds,
      location: "",
      locationLat: null,
      locationLon: null,
    },
    { agentKeyId: agent.id, sourceRef: body.sourceRef ?? null },
  );

  const who = created.memberIds.map((id) => names.get(id)).join(", ");
  const when =
    created.start === created.end
      ? `on ${created.start}`
      : `from ${created.start} to ${created.end}`;
  return {
    event: toAgentEvent(created, names, agent),
    tellUser:
      `Created "${created.title}" for ${who} ${when}.` +
      (body.end === undefined && !created.allDay
        ? ` No end was given, so it lasts ${DEFAULT_TIMED_HOURS} hour.`
        : ""),
  };
}
