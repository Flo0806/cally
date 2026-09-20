import { defineEventHandler } from "nuxt/server";
import { Temporal } from "temporal-polyfill";
import * as v from "valibot";
import type { Today, TodayEvent } from "#shared/types";
import { TIME_ZONE, toDateTimeString } from "#shared/dates";
import { dateString } from "#shared/schemas";
import { expandEvents } from "#shared/occurrences";
import { listEventsInRange } from "../database/events";
import { weatherAt } from "../weather/spot";
import { getValidatedQuery } from "../utils/validate";

// Getting out of the door takes this long, longer when it rains at the destination
const BUFFER_MINUTES = 10;
const RAIN_BUFFER_MINUTES = 10;
const RAIN_THRESHOLD = 50;

const query = v.object({ date: v.optional(dateString) });

export default defineEventHandler(async (event): Promise<Today> => {
  const date =
    getValidatedQuery(event, query).date ?? Temporal.Now.plainDateISO(TIME_ZONE).toString();
  const events = await listEventsInRange(date, date);
  const notesById = new Map(events.map((e) => [e.id, e.notes]));
  const occurrences = expandEvents(events, date, date);

  const result: TodayEvent[] = await Promise.all(
    occurrences.map(async (occurrence) => {
      const hasPlace = occurrence.locationLat !== null && occurrence.locationLon !== null;
      const at = occurrence.allDay ? `${date}T12:00` : occurrence.start;

      let weather = null;
      if (hasPlace) {
        try {
          weather = await weatherAt(occurrence.locationLat!, occurrence.locationLon!, at);
        } catch (error) {
          console.warn(`[today] weather failed for ${occurrence.title}: ${String(error)}`);
        }
      }

      const rainWarning = (weather?.rain ?? 0) >= RAIN_THRESHOLD;
      const bufferMinutes = BUFFER_MINUTES + (rainWarning ? RAIN_BUFFER_MINUTES : 0);
      const departAt =
        !occurrence.allDay && hasPlace && occurrence.travelMinutes !== null
          ? toDateTimeString(
              Temporal.PlainDateTime.from(occurrence.start).subtract({
                minutes: occurrence.travelMinutes + bufferMinutes,
              }),
            )
          : null;

      return {
        ...occurrence,
        notes: notesById.get(occurrence.eventId) ?? "",
        departAt,
        bufferMinutes,
        rainWarning,
        weather,
      };
    }),
  );

  return { date, events: result };
});
