import { createError } from "nuxt/server";
import type { Todo } from "#shared/types";
import type { TodoInput, TodoPatch } from "#shared/schemas";
import { nowIso } from "#shared/dates";
import { useDb } from "../utils/db";

type Row = Record<string, unknown>;

function toTodo(row: Row): Todo {
  return {
    id: String(row.id),
    title: String(row.title),
    done: row.done === 1,
    position: Number(row.position),
    memberId: row.member_id === null ? null : String(row.member_id),
    createdAt: String(row.created_at),
    doneAt: row.done_at === null ? null : String(row.done_at),
  };
}

// Open todos by position, done ones after that with the latest first
export async function listTodos(): Promise<Todo[]> {
  const db = await useDb();
  const rows = (await db
    .prepare("SELECT * FROM todos ORDER BY done, CASE WHEN done THEN done_at END DESC, position")
    .all()) as Row[];
  return rows.map(toTodo);
}

export async function getTodo(id: string): Promise<Todo> {
  const db = await useDb();
  const row = (await db.prepare("SELECT * FROM todos WHERE id = ?").get(id)) as Row | undefined;
  if (!row) throw createError({ statusCode: 404, message: "Todo nicht gefunden" });
  return toTodo(row);
}

export async function createTodo(input: TodoInput): Promise<Todo> {
  const db = await useDb();
  const id = crypto.randomUUID();
  const { next } = (await db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM todos")
    .get()) as { next: number };
  try {
    await db
      .prepare(
        "INSERT INTO todos (id, title, done, position, member_id, created_at, done_at) VALUES (?, ?, 0, ?, ?, ?, NULL)",
      )
      .run(id, input.title, next, input.memberId, nowIso());
  } catch (error) {
    if (String((error as Error).message).includes("FOREIGN KEY")) {
      throw createError({ statusCode: 400, message: "Unbekanntes Mitglied" });
    }
    throw error;
  }
  return getTodo(id);
}

export async function updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
  const current = await getTodo(id);
  const next = { ...current, ...patch };
  // done_at tracks the transition, not every save
  const doneAt = next.done ? (current.done ? current.doneAt : nowIso()) : null;
  const db = await useDb();
  await db
    .prepare(
      "UPDATE todos SET title = ?, done = ?, position = ?, member_id = ?, done_at = ? WHERE id = ?",
    )
    .run(next.title, next.done ? 1 : 0, next.position, next.memberId, doneAt, id);
  return getTodo(id);
}

export async function deleteTodo(id: string): Promise<void> {
  await getTodo(id);
  const db = await useDb();
  await db.prepare("DELETE FROM todos WHERE id = ?").run(id);
}

export async function deleteDoneTodos(): Promise<void> {
  const db = await useDb();
  await db.prepare("DELETE FROM todos WHERE done = 1").run();
}
