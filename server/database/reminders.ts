import { Temporal } from "temporal-polyfill";
import { nowIso } from "#shared/dates";
import { useDb } from "../utils/db";

export type ReminderKind = "hour" | "soon";

export async function sentReminders(): Promise<Set<string>> {
  const db = await useDb();
  const rows = (await db.prepare("SELECT occurrence_key, kind FROM reminders_sent").all()) as {
    occurrence_key: string;
    kind: string;
  }[];
  return new Set(rows.map((r) => `${r.occurrence_key}|${r.kind}`));
}

export async function markReminderSent(occurrenceKey: string, kind: ReminderKind): Promise<void> {
  const db = await useDb();
  await db
    .prepare(
      `INSERT INTO reminders_sent (occurrence_key, kind, sent_at) VALUES (?, ?, ?)
       ON CONFLICT (occurrence_key, kind) DO NOTHING`,
    )
    .run(occurrenceKey, kind, nowIso());
}

// Rows older than two days are of no use, occurrences never come back
export async function pruneReminders(): Promise<void> {
  const db = await useDb();
  const cutoff = Temporal.Now.instant().subtract({ hours: 48 }).toString();
  await db.prepare("DELETE FROM reminders_sent WHERE sent_at < ?").run(cutoff);
}
