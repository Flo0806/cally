import type { RequestEvent } from "nuxt/server";
import { AGENT_KEY_PREFIX, findAgentKey, touchAgentKey } from "../database/agent-keys";
import { agentError } from "./errors";

const KEY_PATTERN = new RegExp(`^${AGENT_KEY_PREFIX}[A-Za-z0-9_-]{43}$`);
const MAX_BODY_BYTES = 64 * 1024;
const REQUESTS_PER_MINUTE = 120;

export interface AgentContext {
  id: string;
  name: string;
}

// With the slash, so /api/agent-keys (the settings side) stays behind the session
export function isAgentPath(path: string): boolean {
  return path === "/api/agent" || path.startsWith("/api/agent/");
}

export function agentOf(event: RequestEvent): AgentContext | undefined {
  return event.context.agent as AgentContext | undefined;
}

// Sliding window in memory: one process, and a restart only ever forgives
const hits = new Map<string, number[]>();

function secondsUntilFree(id: string): number {
  const now = performance.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= REQUESTS_PER_MINUTE) {
    hits.set(id, recent);
    return Math.ceil((recent[0]! + 60_000 - now) / 1000);
  }
  recent.push(now);
  hits.set(id, recent);
  return 0;
}

// The bearer key is the only credential here, cookies are never read. Undefined lets it through.
export async function openAgentDoor(event: RequestEvent): Promise<Response | undefined> {
  const header = event.req.headers.get("authorization");
  if (!header) {
    return agentError(401, {
      code: "missing_key",
      message: "No Authorization header.",
      hint: `Send the key as "Authorization: Bearer ${AGENT_KEY_PREFIX}...".`,
    });
  }
  if (Number(event.req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return agentError(413, {
      code: "payload_too_large",
      message: `The body is larger than ${MAX_BODY_BYTES / 1024} KB.`,
    });
  }

  const key = /^Bearer\s+(\S+)$/i.exec(header.trim())?.[1];
  const found = key && KEY_PATTERN.test(key) ? await findAgentKey(key) : null;
  if (!found) {
    return agentError(401, {
      code: "invalid_key",
      message: "The key is not valid.",
      hint: "Check that the key was copied completely, or ask the user for a new one.",
    });
  }
  if (found.revokedAt) {
    return agentError(401, {
      code: "key_revoked",
      message: "The key was revoked.",
      hint: "Ask the user for a new key.",
    });
  }

  const wait = secondsUntilFree(found.id);
  if (wait) {
    return agentError(
      429,
      {
        code: "rate_limited",
        message: `More than ${REQUESTS_PER_MINUTE} requests in a minute.`,
        hint: `Wait ${wait} seconds.`,
      },
      { "retry-after": String(wait) },
    );
  }

  await touchAgentKey(found.id);
  event.context.agent = { id: found.id, name: found.name } satisfies AgentContext;
}
