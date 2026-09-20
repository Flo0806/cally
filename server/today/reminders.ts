import { Temporal } from "temporal-polyfill";
import type { TodayEvent } from "#shared/types";
import { TIME_ZONE, formatTime, toDateTimeString } from "#shared/dates";
import { listLookups } from "../database/lookups";
import {
  markReminderSent,
  pruneReminders,
  sentReminders,
  type ReminderKind,
} from "../database/reminders";
import { buildToday, todayDate } from "./build";

// Two pushes per timed event: an hour before and a quarter hour before the anchor. The anchor
// is the departure time when there is a place, the start otherwise. All-day events get none.
const WINDOW_MINUTES = 5;
const KINDS: { kind: ReminderKind; minutesBefore: number }[] = [
  { kind: "hour", minutesBefore: 60 },
  { kind: "soon", minutesBefore: 15 },
];

function anchorOf(event: TodayEvent): string | null {
  if (event.allDay) return null;
  return event.departAt ?? event.start;
}

function messageFor(event: TodayEvent, kind: ReminderKind): { title: string; text: string } {
  const lines = [`${event.title} um ${formatTime(event.start)} Uhr`];
  if (event.location) lines.push(event.location);
  if (event.departAt) {
    const parts = [`Losfahren um ${formatTime(event.departAt)}`];
    if (event.travelMinutes !== null) parts.push(`${event.travelMinutes} Min Fahrt`);
    if (event.trafficDelayMinutes) parts.push(`+${event.trafficDelayMinutes} Min Verkehr`);
    lines.push(parts.join(", "));
  }
  if (kind === "soon") {
    if (event.weather) {
      lines.push(
        `Dort: ${event.weather.temp}°${event.weather.rain >= 50 ? ", Regen wahrscheinlich" : ""}`,
      );
    }
    for (const incident of event.incidents.filter((i) => i.severity !== "info").slice(0, 2)) {
      lines.push(`${incident.kind}${incident.road ? ` ${incident.road}` : ""}`);
    }
  }
  const title =
    kind === "hour"
      ? `In einer Stunde: ${event.departAt ? "losfahren" : event.title}`
      : `Gleich ${event.departAt ? "losfahren" : "los"}: ${event.title}`;
  return { title, text: lines.join("\n") };
}

export async function pushDueReminders(): Promise<{ sent: number; checked: number }> {
  const now = Temporal.Now.plainDateTimeISO(TIME_ZONE);
  const windowEnd = now.add({ minutes: WINDOW_MINUTES });
  const nowKey = toDateTimeString(now);
  const endKey = toDateTimeString(windowEnd);

  const today = await buildToday(todayDate());
  const already = await sentReminders();
  const members = await listLookups("members");
  let sent = 0;

  for (const event of today.events) {
    const anchor = anchorOf(event);
    if (!anchor) continue;
    for (const { kind, minutesBefore } of KINDS) {
      const due = toDateTimeString(
        Temporal.PlainDateTime.from(anchor).subtract({ minutes: minutesBefore }),
      );
      // Due inside the window; anything already past is not caught up
      if (due < nowKey || due >= endKey) continue;
      if (already.has(`${event.key}|${kind}`)) continue;

      const assigned = event.memberIds.length
        ? members.filter((m) => event.memberIds.includes(m.id))
        : members;
      const targets = assigned.filter((m) => m.ntfyTopic);
      if (!targets.length) continue;

      const maps =
        event.locationLat !== null && event.locationLon !== null
          ? `https://www.google.com/maps/dir/?api=1&destination=${event.locationLat},${event.locationLon}&travelmode=driving`
          : null;
      const { title, text } = messageFor(event, kind);

      for (const member of targets) {
        await ntfy.send(text, {
          topic: member.ntfyTopic!,
          title,
          tags: [kind === "soon" ? "car" : "alarm_clock"],
          priority: kind === "soon" ? 4 : 3,
          click: kind === "soon" && maps ? maps : undefined,
          actions:
            kind === "soon" && maps
              ? [{ action: "view", label: "Navigation starten", url: maps }]
              : undefined,
        });
        sent++;
      }
      await markReminderSent(event.key, kind);
    }
  }

  await pruneReminders();
  return { sent, checked: today.events.length };
}
