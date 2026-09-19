import { createError } from "nuxt/server";
import { nowIso } from "#shared/dates";
import { useDb } from "../utils/db";

export async function listReads(memberId: string): Promise<string[]> {
  const db = await useDb();
  const rows = (await db
    .prepare("SELECT item_id FROM news_reads WHERE member_id = ?")
    .all(memberId)) as { item_id: string }[];
  return rows.map((row) => row.item_id);
}

export async function addRead(itemId: string, memberId: string): Promise<void> {
  const db = await useDb();
  try {
    await db
      .prepare(
        `INSERT INTO news_reads (member_id, item_id, created_at) VALUES (?, ?, ?)
         ON CONFLICT (member_id, item_id) DO NOTHING`,
      )
      .run(memberId, itemId, nowIso());
  } catch (error) {
    if (String((error as Error).message).includes("FOREIGN KEY")) {
      throw createError({ statusCode: 400, message: "Unbekanntes Mitglied" });
    }
    throw error;
  }
}

export async function removeRead(itemId: string, memberId: string): Promise<void> {
  const db = await useDb();
  await db
    .prepare("DELETE FROM news_reads WHERE member_id = ? AND item_id = ?")
    .run(memberId, itemId);
}
