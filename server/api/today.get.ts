import { defineEventHandler } from "nuxt/server";
import { Temporal } from "temporal-polyfill";
import * as v from "valibot";
import type { RouteIncident, Today, TodayEvent } from "#shared/types";
import { TIME_ZONE, toDateTimeString } from "#shared/dates";
import { dateString } from "#shared/schemas";
import { expandEvents } from "#shared/occurrences";
import { listEventsInRange } from "../database/events";
import { weatherAt } from "../weather/spot";
import { homeCoords } from "../geo/home";
import { trafficRoute } from "../geo/tomtom";
import { incidentsAlong } from "../geo/incidents";
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
  const home = homeCoords();
  const now = toDateTimeString(Temporal.Now.plainDateTimeISO(TIME_ZONE));

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

      // Traffic aware time for events still ahead, the stored OSRM time otherwise
      let travelMinutes = occurrence.travelMinutes;
      let trafficDelayMinutes: number | null = null;
      let travelSource: "tomtom" | "osrm" | null = travelMinutes === null ? null : "osrm";
      let incidents: RouteIncident[] = [];
      const upcoming = !occurrence.allDay && hasPlace && occurrence.start > now;
      if (upcoming && home) {
        try {
          const route = await trafficRoute(
            home,
            { lat: occurrence.locationLat!, lon: occurrence.locationLon! },
            occurrence.start,
          );
          if (route) {
            travelMinutes = route.minutes;
            trafficDelayMinutes = route.delayMinutes;
            travelSource = "tomtom";
            incidents = await incidentsAlong(route.points);
          }
        } catch (error) {
          console.warn(`[today] traffic failed for ${occurrence.title}: ${String(error)}`);
        }
      }

      const departAt =
        !occurrence.allDay && hasPlace && travelMinutes !== null
          ? toDateTimeString(
              Temporal.PlainDateTime.from(occurrence.start).subtract({
                minutes: travelMinutes + bufferMinutes,
              }),
            )
          : null;

      return {
        ...occurrence,
        travelMinutes,
        notes: notesById.get(occurrence.eventId) ?? "",
        departAt,
        bufferMinutes,
        rainWarning,
        weather,
        trafficDelayMinutes,
        travelSource,
        incidents,
      };
    }),
  );

  return { date, events: result };
});
