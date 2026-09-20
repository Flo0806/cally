import { createError } from "nuxt/server";
import type { CalendarEvent } from "#shared/types";
import type { EventInput } from "#shared/schemas";
import { nowIso } from "#shared/dates";
import { useDb } from "../utils/db";
import { driveMinutes } from "../geo/routing";
import { homeCoords } from "../geo/home";

type Row = Record<string, unknown>;

function toEvent(row: Row, memberIds: string[]): CalendarEvent {
  return {
    id: String(row.id),
    title: String(row.title),
    notes: String(row.notes),
    allDay: row.all_day === 1,
    start: String(row.start),
    end: String(row.end),
    rrule: row.rrule === null ? null : String(row.rrule),
    exdates: JSON.parse(String(row.exdates)) as string[],
    categoryId: row.category_id === null ? null : String(row.category_id),
    memberIds,
    location: String(row.location ?? ""),
    locationLat: row.location_lat === null ? null : Number(row.location_lat),
    locationLon: row.location_lon === null ? null : Number(row.location_lon),
    travelMinutes: row.travel_minutes === null ? null : Number(row.travel_minutes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function membersByEvent(eventIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!eventIds.length) return map;
  const db = await useDb();
  const placeholders = eventIds.map(() => "?").join(", ");
  const rows = (await db
    .prepare(`SELECT event_id, member_id FROM event_members WHERE event_id IN (${placeholders})`)
    .all(...eventIds)) as Row[];
  for (const row of rows) {
    const id = String(row.event_id);
    map.set(id, [...(map.get(id) ?? []), String(row.member_id)]);
  }
  return map;
}

async function hydrate(rows: Row[]): Promise<CalendarEvent[]> {
  const members = await membersByEvent(rows.map((row) => String(row.id)));
  return rows.map((row) => toEvent(row, members.get(String(row.id)) ?? []));
}

// Candidates touching [from, to]: recurring events are only bounded by their start, the
// expansion in code decides what actually falls into the range
export async function listEventsInRange(from: string, to: string): Promise<CalendarEvent[]> {
  const db = await useDb();
  const rows = (await db
    .prepare(
      `SELECT * FROM events
       WHERE substr(start, 1, 10) <= ?
         AND (rrule IS NOT NULL OR substr(end, 1, 10) >= ?)`,
    )
    .all(to, from)) as Row[];
  return hydrate(rows);
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  const db = await useDb();
  const row = (await db.prepare("SELECT * FROM events WHERE id = ?").get(id)) as Row | undefined;
  if (!row) throw createError({ statusCode: 404, message: "Termin nicht gefunden" });
  return (await hydrate([row]))[0]!;
}

function isForeignKeyError(error: unknown): boolean {
  return String((error as Error)?.message).includes("FOREIGN KEY");
}

// Drive time from home for the coordinates the editor resolved. Kept from the previous
// version when the place did not move, so a title edit costs no routing request.
async function travelMinutesFor(
  input: EventInput,
  previous: CalendarEvent | null,
): Promise<number | null> {
  if (input.locationLat === null || input.locationLon === null) return null;
  if (
    previous &&
    previous.locationLat === input.locationLat &&
    previous.locationLon === input.locationLon
  ) {
    return previous.travelMinutes;
  }
  const home = homeCoords();
  if (!home) return null;
  try {
    return await driveMinutes(home, { lat: input.locationLat, lon: input.locationLon });
  } catch (error) {
    console.warn(`[geo] routing failed: ${String(error)}`);
    return null;
  }
}

async function writeEvent(
  id: string,
  input: EventInput,
  createdAt: string,
  previous: CalendarEvent | null,
): Promise<CalendarEvent> {
  const travelMinutes = await travelMinutesFor(input, previous);
  const db = await useDb();
  const updatedAt = nowIso();
  await db.exec("BEGIN");
  try {
    await db
      .prepare(
        `INSERT INTO events (id, title, notes, all_day, start, end, rrule, exdates, category_id,
           location, location_lat, location_lon, travel_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           title = excluded.title, notes = excluded.notes, all_day = excluded.all_day,
           start = excluded.start, end = excluded.end, rrule = excluded.rrule,
           exdates = excluded.exdates, category_id = excluded.category_id,
           location = excluded.location, location_lat = excluded.location_lat,
           location_lon = excluded.location_lon, travel_minutes = excluded.travel_minutes,
           updated_at = excluded.updated_at`,
      )
      .run(
        id,
        input.title,
        input.notes,
        input.allDay ? 1 : 0,
        input.start,
        input.end,
        input.rrule,
        JSON.stringify(input.exdates),
        input.categoryId,
        input.location,
        input.locationLat,
        input.locationLon,
        travelMinutes,
        createdAt,
        updatedAt,
      );
    await db.prepare("DELETE FROM event_members WHERE event_id = ?").run(id);
    for (const memberId of input.memberIds) {
      await db
        .prepare("INSERT INTO event_members (event_id, member_id) VALUES (?, ?)")
        .run(id, memberId);
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    if (isForeignKeyError(error)) {
      throw createError({
        statusCode: 400,
        message: "Unbekannte Kategorie oder unbekanntes Mitglied",
      });
    }
    throw error;
  }
  return getEvent(id);
}

export function createEvent(input: EventInput): Promise<CalendarEvent> {
  return writeEvent(crypto.randomUUID(), input, nowIso(), null);
}

export async function updateEvent(id: string, input: EventInput): Promise<CalendarEvent> {
  const current = await getEvent(id);
  return writeEvent(id, input, current.createdAt, current);
}

export async function deleteEvent(id: string): Promise<void> {
  await getEvent(id);
  const db = await useDb();
  await db.prepare("DELETE FROM events WHERE id = ?").run(id);
}

// Removes one instance of a series by recording its start as an exception date
export async function excludeOccurrence(id: string, start: string): Promise<CalendarEvent> {
  const current = await getEvent(id);
  if (!current.rrule) throw createError({ statusCode: 400, message: "Kein Serientermin" });
  if (current.exdates.includes(start)) return current;
  const db = await useDb();
  await db
    .prepare("UPDATE events SET exdates = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify([...current.exdates, start]), nowIso(), id);
  return getEvent(id);
}
