import { createError } from "nuxt/server";
import type { NewsHeart } from "#shared/types";
import type { HeartInput } from "#shared/schemas";
import { nowIso } from "#shared/dates";
import { useDb } from "../utils/db";

type Row = Record<string, unknown>;

function toHeart(row: Row): NewsHeart {
  return {
    itemId: String(row.item_id),
    categoryId: String(row.category_id),
    createdAt: String(row.created_at),
  };
}

export async function listHearts(memberId: string): Promise<NewsHeart[]> {
  const db = await useDb();
  const rows = (await db
    .prepare("SELECT * FROM news_hearts WHERE member_id = ? ORDER BY created_at DESC")
    .all(memberId)) as Row[];
  return rows.map(toHeart);
}

export async function addHeart(itemId: string, input: HeartInput): Promise<NewsHeart> {
  const db = await useDb();
  const createdAt = nowIso();
  try {
    await db
      .prepare(
        `INSERT INTO news_hearts (member_id, item_id, category_id, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (member_id, item_id) DO NOTHING`,
      )
      .run(input.memberId, itemId, input.categoryId, createdAt);
  } catch (error) {
    if (String((error as Error).message).includes("FOREIGN KEY")) {
      throw createError({ statusCode: 400, message: "Unbekanntes Mitglied" });
    }
    throw error;
  }
  return { itemId, categoryId: input.categoryId, createdAt };
}

export async function removeHeart(itemId: string, memberId: string): Promise<void> {
  const db = await useDb();
  await db
    .prepare("DELETE FROM news_hearts WHERE member_id = ? AND item_id = ?")
    .run(memberId, itemId);
}

export async function removeCategoryHearts(memberId: string, categoryId: string): Promise<void> {
  const db = await useDb();
  await db
    .prepare("DELETE FROM news_hearts WHERE member_id = ? AND category_id = ?")
    .run(memberId, categoryId);
}
