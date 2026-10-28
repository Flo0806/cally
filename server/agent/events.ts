import { Temporal } from "temporal-polyfill";
import * as v from "valibot";
import { TIME_ZONE, dateOf, isDateString, isDateTimeString, toDateTimeString } from "#shared/dates";
import { expandEvents } from "#shared/occurrences";
import type { CalendarEvent } from "#shared/types";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEventsInRange,
  updateEvent,
} from "../database/events";
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
  category: { id: string; name: string } | null;
  location: string;
  notes: string;
  sourceRef: string | null;
  createdByYou: boolean;
  deletable: boolean;
}

// false lets agents delete any single event, the family's too
export const DELETE_ONLY_OWN = true;
// Yesterday still counts, older events are history
export const DELETE_GRACE_DAYS = 1;

function deleteRefusal(event: CalendarEvent, agent: AgentContext): AgentError | null {
  if (DELETE_ONLY_OWN && event.agentKeyId !== agent.id) return notOwnEvent();
  if (event.rrule) {
    return new AgentError(409, {
      code: "recurring_event",
      message: "Recurring events cannot be deleted through this API.",
      hint: "Tell the user, they can delete the series or one date of it in the app.",
    });
  }
  const oldest = Temporal.Now.plainDateISO(TIME_ZONE).subtract({ days: DELETE_GRACE_DAYS });
  if (dateOf(event.end) < oldest.toString()) {
    return new AgentError(409, {
      code: "event_in_past",
      message: `Only events that end on ${oldest} or later can be deleted.`,
      hint: "Past events stay as a record. Tell the user if it should go anyway.",
    });
  }
  return null;
}

// The one shape an agent sees an event in, from search, lookup and create alike
function toAgentEvent(event: CalendarEvent, names: Names, agent: AgentContext): AgentEvent {
  return {
    eventId: event.id,
    title: event.title,
    allDay: event.allDay,
    start: event.start,
    end: event.end,
    recurring: event.rrule !== null,
    members: event.memberIds.map((id) => ({ id, name: names.members.get(id) ?? "" })),
    category: event.categoryId
      ? { id: event.categoryId, name: names.categories.get(event.categoryId) ?? "" }
      : null,
    location: event.location,
    notes: event.notes,
    sourceRef: event.sourceRef,
    createdByYou: event.agentKeyId === agent.id,
    deletable: deleteRefusal(event, agent) === null,
  };
}

interface Names {
  members: Map<string, string>;
  categories: Map<string, string>;
}

// Names by id, and the check that every id the agent sent exists
async function lookupNames(
  sent: { memberIds?: string[]; categoryId?: string | null } = {},
): Promise<Names> {
  const [members, categories] = await Promise.all([
    listLookups("members"),
    listLookups("categories"),
  ]);
  const names: Names = {
    members: new Map(members.map((m) => [m.id, m.name])),
    categories: new Map(categories.map((c) => [c.id, c.name])),
  };
  const unknown = (sent.memberIds ?? []).filter((id) => !names.members.has(id));
  if (unknown.length) {
    throw new AgentError(400, {
      code: "unknown_member",
      message: `Unknown member id: ${unknown.join(", ")}.`,
      hint: "Take member ids from GET /api/agent/members.",
    });
  }
  if (sent.categoryId != null && !names.categories.has(sent.categoryId)) {
    throw new AgentError(400, {
      code: "unknown_category",
      message: `Unknown category id: ${sent.categoryId}.`,
      hint: "Take category ids from GET /api/agent/categories. You cannot create categories.",
    });
  }
  return names;
}

export async function searchOccurrences(
  { from, to, q, memberIds, sourceRef }: EventSearchQuery,
  agent: AgentContext,
) {
  const [events, names] = await Promise.all([
    listEventsInRange(from, to),
    lookupNames({ memberIds }),
  ]);

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

const title = v.pipe(
  v.string("Must be a string."),
  v.trim(),
  v.minLength(1, "Must not be empty."),
  v.maxLength(120, "At most 120 characters."),
);
const memberIds = v.pipe(
  v.array(v.string(), "Must be an array of member ids."),
  v.minLength(1, "At least one member id."),
  // A member sent twice would break the insert into event_members
  v.transform((ids) => [...new Set(ids)]),
);
const notes = v.pipe(
  v.string("Must be a string."),
  v.trim(),
  v.maxLength(2000, "At most 2000 characters."),
);

const categoryId = v.nullable(v.string("Must be a category id or null."));

// The agent's own body, mapped onto the app's event in `createAgentEvent`. Location and repeat
// are left out: a location needs coordinates the agent cannot resolve.
export const eventCreateBody = v.pipe(
  v.strictObject({
    title,
    allDay: v.boolean("Must be true or false."),
    start: v.string("Must be a string."),
    end: v.optional(v.string("Must be a string.")),
    memberIds,
    notes: v.optional(notes, ""),
    categoryId: v.optional(categoryId, null),
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

function findEvent(id: string): Promise<CalendarEvent> {
  return getEvent(id).catch((error: { statusCode?: number }) => {
    if (error.statusCode !== 404) throw error;
    throw new AgentError(404, {
      code: "not_found",
      message: `There is no event with id ${id}.`,
      hint: "Take event ids from GET /api/agent/events.",
    });
  });
}

function notOwnEvent(): AgentError {
  return new AgentError(403, {
    code: "not_own_event",
    message: "This event was not created with your key.",
    hint: "Tell the user what should change, they can do it in the app.",
  });
}

async function findOwnEvent(id: string, agent: AgentContext): Promise<CalendarEvent> {
  const event = await findEvent(id);
  if (event.agentKeyId !== agent.id) throw notOwnEvent();
  return event;
}

export async function getAgentEvent(id: string, agent: AgentContext): Promise<AgentEvent> {
  const [event, names] = await Promise.all([findEvent(id), lookupNames()]);
  return toAgentEvent(event, names, agent);
}

function defaultEnd(allDay: boolean, start: string): string {
  return allDay
    ? start
    : toDateTimeString(Temporal.PlainDateTime.from(start).add({ hours: DEFAULT_TIMED_HOURS }));
}

// A moved start takes the end along, so "moved to 19:00" keeps the length of the event
function shiftedEnd(event: CalendarEvent, start: string): string {
  if (event.allDay) {
    const days = Temporal.PlainDate.from(event.end).since(event.start).days;
    return Temporal.PlainDate.from(start).add({ days }).toString();
  }
  const length = Temporal.PlainDateTime.from(event.end).since(event.start);
  return toDateTimeString(Temporal.PlainDateTime.from(start).add(length));
}

export async function createAgentEvent(body: EventCreateBody, agent: AgentContext) {
  const names = await lookupNames(body);
  const end = body.end ?? defaultEnd(body.allDay, body.start);

  const created = await createEvent(
    {
      title: body.title,
      notes: body.notes,
      allDay: body.allDay,
      start: body.start,
      end,
      rrule: null,
      exdates: [],
      categoryId: body.categoryId,
      memberIds: body.memberIds,
      location: "",
      locationLat: null,
      locationLon: null,
    },
    { agentKeyId: agent.id, sourceRef: body.sourceRef ?? null },
  );

  const who = created.memberIds.map((id) => names.members.get(id)).join(", ");
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

export const eventPatchBody = v.pipe(
  v.strictObject({
    title: v.optional(title),
    allDay: v.optional(v.boolean("Must be true or false.")),
    start: v.optional(v.string("Must be a string.")),
    end: v.optional(v.string("Must be a string.")),
    memberIds: v.optional(memberIds),
    notes: v.optional(notes),
    categoryId: v.optional(categoryId),
  }),
  v.check((body) => Object.keys(body).length > 0, "Send at least one field to change."),
);

export type EventPatchBody = v.InferOutput<typeof eventPatchBody>;

const FORMAT_HINT = "Must be YYYY-MM-DD for an all-day event, YYYY-MM-DDTHH:mm otherwise.";

function invalid(path: string, message: string): AgentError {
  return new AgentError(400, {
    code: "validation_failed",
    message: "The request has invalid fields.",
    hint: "Fix exactly the fields in issues and try once more.",
    issues: [{ path, message }],
  });
}

export async function updateAgentEvent(id: string, body: EventPatchBody, agent: AgentContext) {
  const current = await findOwnEvent(id, agent);
  const names = await lookupNames(body);

  // The result is judged as a whole: a new allDay needs a start in its format
  const allDay = body.allDay ?? current.allDay;
  const start = body.start ?? current.start;
  if (!validStart(allDay, start)) throw invalid("start", FORMAT_HINT);
  const end =
    body.end ??
    (body.allDay !== undefined && body.allDay !== current.allDay
      ? defaultEnd(allDay, start)
      : body.start
        ? shiftedEnd(current, start)
        : current.end);
  if (!validStart(allDay, end)) throw invalid("end", FORMAT_HINT);
  if (end < start) throw invalid("end", "Must not be before start.");

  // Location and repetition stay as the family set them in the app
  const updated = await updateEvent(id, {
    title: body.title ?? current.title,
    notes: body.notes ?? current.notes,
    allDay,
    start,
    end,
    rrule: current.rrule,
    exdates: current.exdates,
    categoryId: body.categoryId === undefined ? current.categoryId : body.categoryId,
    memberIds: body.memberIds ?? current.memberIds,
    location: current.location,
    locationLat: current.locationLat,
    locationLon: current.locationLon,
  });

  const fields = ["title", "allDay", "start", "end", "memberIds", "categoryId", "notes"] as const;
  const changed = fields.filter(
    (field) => JSON.stringify(current[field]) !== JSON.stringify(updated[field]),
  );
  return {
    event: toAgentEvent(updated, names, agent),
    tellUser: changed.length
      ? `Changed ${changed.join(", ")} of "${updated.title}".`
      : `Nothing changed on "${updated.title}".`,
  };
}

export async function deleteAgentEvent(id: string, agent: AgentContext) {
  const event = await findEvent(id);
  const refusal = deleteRefusal(event, agent);
  if (refusal) throw refusal;
  await deleteEvent(id);
  return { deleted: id, tellUser: `Deleted "${event.title}".` };
}
