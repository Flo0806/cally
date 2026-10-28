import { createHash, randomBytes } from "node:crypto";
import { createError } from "nuxt/server";
import { Temporal } from "temporal-polyfill";
import type { AgentKey } from "#shared/types";
import { nowIso } from "#shared/dates";
import { useDb } from "../utils/db";

export const AGENT_KEY_PREFIX = "cally_agent_";

type Row = Record<string, unknown>;

function toAgentKey(row: Row): AgentKey {
  return {
    id: String(row.id),
    name: String(row.name),
    prefix: String(row.prefix),
    createdAt: String(row.created_at),
    lastUsedAt: row.last_used_at === null ? null : String(row.last_used_at),
    revokedAt: row.revoked_at === null ? null : String(row.revoked_at),
  };
}

// 32 random bytes cannot be guessed, so a fast digest is enough and allows a direct lookup
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function listAgentKeys(): Promise<AgentKey[]> {
  const db = await useDb();
  const rows = (await db
    .prepare("SELECT * FROM agent_keys ORDER BY revoked_at IS NOT NULL, created_at DESC")
    .all()) as Row[];
  return rows.map(toAgentKey);
}

// The plain key is returned here and nowhere else
export async function createAgentKey(name: string): Promise<{ key: string; agentKey: AgentKey }> {
  const db = await useDb();
  const id = crypto.randomUUID();
  const key = `${AGENT_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  await db
    .prepare(
      "INSERT INTO agent_keys (id, name, prefix, token_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, name, key.slice(0, AGENT_KEY_PREFIX.length + 6), hashKey(key), nowIso());
  const row = (await db.prepare("SELECT * FROM agent_keys WHERE id = ?").get(id)) as Row;
  return { key, agentKey: toAgentKey(row) };
}

export async function revokeAgentKey(id: string): Promise<AgentKey> {
  const db = await useDb();
  await db
    .prepare("UPDATE agent_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
    .run(nowIso(), id);
  const row = (await db.prepare("SELECT * FROM agent_keys WHERE id = ?").get(id)) as
    | Row
    | undefined;
  if (!row) throw createError({ statusCode: 404, message: "Key nicht gefunden" });
  return toAgentKey(row);
}

// Revoked keys are found too, so the caller can tell "revoked" from "unknown"
export async function findAgentKey(key: string): Promise<AgentKey | null> {
  const db = await useDb();
  const row = (await db
    .prepare("SELECT * FROM agent_keys WHERE token_hash = ?")
    .get(hashKey(key))) as Row | undefined;
  return row ? toAgentKey(row) : null;
}

// At most once a minute, otherwise every agent read becomes a write
export async function touchAgentKey(id: string): Promise<void> {
  const db = await useDb();
  const now = Temporal.Now.instant();
  await db
    .prepare(
      "UPDATE agent_keys SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at < ?)",
    )
    .run(now.toString(), id, now.subtract({ minutes: 1 }).toString());
}
