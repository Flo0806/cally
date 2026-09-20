import type { TodayEvent } from "#shared/types";
import { formatTime } from "#shared/dates";
import { listLookups } from "../database/lookups";

// Push one of today's events to the phones of the members it concerns, or to everyone
// with a phone when nobody is assigned. Tapping opens Google Maps with the destination.
export async function notifyEvent(event: TodayEvent): Promise<string[]> {
  const members = await listLookups("members");
  const assigned = event.memberIds.length
    ? members.filter((m) => event.memberIds.includes(m.id))
    : members;
  const targets = assigned.filter((m) => m.ntfyTopic);
  if (!targets.length) return [];

  const lines = [event.allDay ? "Ganztägig" : `${formatTime(event.start)} Uhr`];
  if (event.location) lines.push(event.location);
  if (event.departAt) {
    const parts = [`Losfahren um ${formatTime(event.departAt)}`];
    if (event.travelMinutes !== null) parts.push(`${event.travelMinutes} Min Fahrt`);
    if (event.trafficDelayMinutes) parts.push(`+${event.trafficDelayMinutes} Min Verkehr`);
    lines.push(parts.join(", "));
  }
  if (event.weather) {
    lines.push(
      `Dort: ${event.weather.temp}°${event.weather.rain >= 50 ? ", Regen wahrscheinlich" : ""}`,
    );
  }
  for (const incident of event.incidents.filter((i) => i.severity !== "info").slice(0, 2)) {
    lines.push(`${incident.kind}${incident.road ? ` ${incident.road}` : ""}`);
  }

  const maps =
    event.locationLat !== null && event.locationLon !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${event.locationLat},${event.locationLon}&travelmode=driving`
      : null;

  const sent: string[] = [];
  for (const member of targets) {
    await ntfy.send(lines.join("\n"), {
      topic: member.ntfyTopic!,
      title: event.title,
      tags: ["car"],
      priority: 4,
      click: maps ?? undefined,
      actions: maps ? [{ action: "view", label: "Navigation starten", url: maps }] : undefined,
    });
    sent.push(member.name);
  }
  return sent;
}
