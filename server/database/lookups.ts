import { createError } from "nuxt/server";
import type { Lookup } from "#shared/types";
import type { LookupInput, LookupPatch } from "#shared/schemas";
import { useDb } from "../utils/db";

// Only these tables may be interpolated into SQL below
export type LookupTable = "members" | "categories";

type Row = Record<string, unknown>;

function toLookup(row: Row): Lookup {
  return {
    id: String(row.id),
    name: String(row.name),
    color: row.color as Lookup["color"],
    position: Number(row.position),
  };
}

export async function listLookups(table: LookupTable): Promise<Lookup[]> {
  const db = await useDb();
  const rows = (await db.prepare(`SELECT * FROM ${table} ORDER BY position, name`).all()) as Row[];
  return rows.map(toLookup);
}

export async function getLookup(table: LookupTable, id: string): Promise<Lookup> {
  const db = await useDb();
  const row = (await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)) as Row | undefined;
  if (!row) throw createError({ statusCode: 404, message: "Eintrag nicht gefunden" });
  return toLookup(row);
}

export async function createLookup(table: LookupTable, input: LookupInput): Promise<Lookup> {
  const db = await useDb();
  const id = crypto.randomUUID();
  const position =
    input.position ??
    (
      (await db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS next FROM ${table}`).get()) as {
        next: number;
      }
    ).next;
  await db
    .prepare(`INSERT INTO ${table} (id, name, color, position) VALUES (?, ?, ?, ?)`)
    .run(id, input.name, input.color, position);
  return { id, name: input.name, color: input.color, position };
}

export async function updateLookup(
  table: LookupTable,
  id: string,
  patch: LookupPatch,
): Promise<Lookup> {
  const current = await getLookup(table, id);
  const next = { ...current, ...patch };
  const db = await useDb();
  await db
    .prepare(`UPDATE ${table} SET name = ?, color = ?, position = ? WHERE id = ?`)
    .run(next.name, next.color, next.position, id);
  return next;
}

export async function deleteLookup(table: LookupTable, id: string): Promise<void> {
  // run() only reports success, not affected rows, so check existence first for a proper 404
  await getLookup(table, id);
  const db = await useDb();
  await db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}
