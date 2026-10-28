import { createHash, randomBytes, randomUUID } from "node:crypto";
import { request } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/*
 * The agent API from the outside, against the running dev server: a key opens `/api/agent/*` and
 * nothing else, and every refusal comes back in the one English shape an agent can act on.
 * The test writes its own keys and events into the dev database and removes exactly those again.
 */

const BASE = process.env.CALLY_URL ?? "http://localhost:3005";
const DB_PATH = process.env.CALLY_DB ?? ".data/db.sqlite";
const TAG = `vitest-${randomUUID().slice(0, 8)}`;

const db = new DatabaseSync(DB_PATH);
const createdEvents: string[] = [];

function insertKey(name: string, revoked = false): string {
  const key = `cally_agent_${randomBytes(32).toString("base64url")}`;
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO agent_keys (id, name, prefix, token_hash, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    randomUUID(),
    name,
    key.slice(0, 18),
    createHash("sha256").update(key).digest("hex"),
    now,
    revoked ? now : null,
  );
  return key;
}

let key = "";
let revokedKey = "";
let memberId = "";

beforeAll(async () => {
  key = insertKey(`${TAG} main`);
  revokedKey = insertKey(`${TAG} revoked`, true);
  const members = (await (await agent(key, "GET", "/api/agent/members")).json()) as {
    id: string;
  }[];
  memberId = members[0]?.id ?? "";
});

afterAll(() => {
  for (const id of createdEvents) db.prepare("DELETE FROM events WHERE id = ?").run(id);
  db.prepare("DELETE FROM agent_keys WHERE name LIKE ?").run(`${TAG}%`);
  db.close();
});

function agent(apiKey: string | null, method: string, path: string, body?: unknown) {
  return fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(apiKey === null ? {} : { authorization: `Bearer ${apiKey}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// fetch resolves `..` before sending, node:http sends the path exactly as written
function rawGet(path: string, apiKey: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      BASE + "/",
      { path, headers: { authorization: `Bearer ${apiKey}` } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

interface AgentErrorBody {
  code: string;
  message: string;
  hint?: string;
  issues?: { path: string; message: string }[];
}

async function errorOf(response: Response): Promise<AgentErrorBody> {
  return ((await response.json()) as { error: AgentErrorBody }).error;
}

describe("the door", () => {
  it("refuses a request without a key", async () => {
    const response = await agent(null, "GET", "/api/agent");
    expect(response.status).toBe(401);
    expect((await errorOf(response)).code).toBe("missing_key");
  });

  it("refuses a malformed and an unknown key", async () => {
    for (const bad of ["nope", `cally_agent_${"A".repeat(43)}`]) {
      const response = await agent(bad, "GET", "/api/agent");
      expect(response.status).toBe(401);
      expect((await errorOf(response)).code).toBe("invalid_key");
    }
  });

  it("refuses a revoked key", async () => {
    const response = await agent(revokedKey, "GET", "/api/agent");
    expect(response.status).toBe(401);
    expect((await errorOf(response)).code).toBe("key_revoked");
  });

  it("does not read cookies on agent routes", async () => {
    const response = await fetch(`${BASE}/api/agent`, { headers: { cookie: "nuxt-session=x" } });
    expect((await errorOf(response)).code).toBe("missing_key");
  });

  it("opens nothing outside /api/agent", async () => {
    for (const path of ["/api/todos", "/api/agent-keys", "/api/members"]) {
      expect((await agent(key, "GET", path)).status, path).toBe(401);
    }
  });

  it("is not fooled by dot segments", async () => {
    for (const path of [
      "/api/agent/../todos",
      "/api/agent/%2e%2e/todos",
      "/api/agent/%2E%2E/todos",
      "/api/agent%2f..%2ftodos",
    ]) {
      expect((await rawGet(path, key)).status, path).toBe(401);
    }
  });

  it("refuses a body over 64 KB before reading it", async () => {
    const response = await agent(key, "POST", "/api/agent/events", { notes: "a".repeat(70_000) });
    expect(response.status).toBe(413);
    expect((await errorOf(response)).code).toBe("payload_too_large");
  });

  it("limits a key to 120 requests a minute", async () => {
    const busy = insertKey(`${TAG} busy`);
    const statuses = [];
    for (let i = 0; i < 121; i++) statuses.push((await agent(busy, "GET", "/api/agent/x")).status);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
    const limited = await agent(busy, "GET", "/api/agent/x");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await errorOf(limited)).code).toBe("rate_limited");
  });

  it("records when a key was used", () => {
    const row = db
      .prepare("SELECT last_used_at FROM agent_keys WHERE name = ?")
      .get(`${TAG} main`) as { last_used_at: string | null };
    expect(row.last_used_at).not.toBeNull();
  });
});

describe("routes", () => {
  it("serves the manual as markdown", async () => {
    const response = await agent(key, "GET", "/api/agent");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    const manual = await response.text();
    expect(manual).toContain(`Key: "${TAG} main"`);
    expect(manual).toContain("Today is");
  });

  it("answers unknown paths and methods in the agent shape", async () => {
    for (const [method, path] of [
      ["GET", "/api/agent/nope"],
      ["POST", "/api/agent"],
      ["POST", "/api/agent/members"],
      ["PUT", "/api/agent/events/nope"],
    ] as const) {
      const response = await agent(key, method, path);
      expect(response.status, `${method} ${path}`).toBe(404);
      expect((await errorOf(response)).code).toBe("not_found");
    }
  });

  it("lists members with id and name only", async () => {
    const members = (await (await agent(key, "GET", "/api/agent/members")).json()) as object[];
    expect(members.length).toBeGreaterThan(0);
    for (const member of members) expect(Object.keys(member).sort()).toEqual(["id", "name"]);
  });
});

describe("searching events", () => {
  const search = (query: string) => agent(key, "GET", `/api/agent/events${query}`);

  it("requires a range", async () => {
    const error = await errorOf(await search(""));
    expect(error.code).toBe("validation_failed");
    expect(error.issues).toEqual([
      { path: "from", message: "Required." },
      { path: "to", message: "Required." },
    ]);
  });

  it("refuses a broken date with 400, not 500", async () => {
    const response = await search("?from=28.10.2026&to=2026-11-18");
    expect(response.status).toBe(400);
    expect((await errorOf(response)).issues?.[0]?.path).toBe("from");
  });

  it("refuses a range over 366 days and one that runs backwards", async () => {
    for (const query of ["?from=2026-01-01&to=2027-06-01", "?from=2026-11-10&to=2026-11-01"]) {
      const error = await errorOf(await search(query));
      expect(error.issues?.[0]?.path, query).toBe("to");
    }
  });

  it("refuses unknown fields and unknown members", async () => {
    const field = await errorOf(await search("?from=2026-11-01&to=2026-11-02&member=x"));
    expect(field.issues).toEqual([{ path: "member", message: "Unknown field." }]);
    const member = await errorOf(await search("?from=2026-11-01&to=2026-11-02&memberIds=nope"));
    expect(member.code).toBe("unknown_member");
  });
});

describe("creating events", () => {
  const create = (body: unknown) => agent(key, "POST", "/api/agent/events", body);

  it("refuses a body that is not an object, unknown fields and no members", async () => {
    expect((await errorOf(await create("text"))).issues?.[0]?.message).toBe(
      "Must be a JSON object.",
    );
    const base = { title: `${TAG} x`, allDay: true, start: "2026-11-12" };
    expect(
      (await errorOf(await create({ ...base, memberIds: [memberId], location: "x" }))).issues,
    ).toEqual([{ path: "location", message: "Unknown field." }]);
    expect((await errorOf(await create({ ...base, memberIds: [] }))).issues?.[0]?.path).toBe(
      "memberIds",
    );
    expect((await errorOf(await create({ ...base, memberIds: ["nope"] }))).code).toBe(
      "unknown_member",
    );
  });

  it("checks the date format against allDay and the end against the start", async () => {
    const base = { title: `${TAG} x`, memberIds: [memberId] };
    const timed = await errorOf(await create({ ...base, allDay: false, start: "2026-11-12" }));
    expect(timed.issues?.[0]?.path).toBe("start");
    const backwards = await errorOf(
      await create({ ...base, allDay: false, start: "2026-11-12T18:00", end: "2026-11-12T17:00" }),
    );
    expect(backwards.issues).toEqual([{ path: "end", message: "Must not be before start." }]);
  });

  it("creates an event that the search then finds", async () => {
    const title = `${TAG} Nuxt Meetup`;
    const response = await create({
      title,
      allDay: false,
      start: "2026-11-12T18:30",
      memberIds: [memberId],
    });
    expect(response.status).toBe(201);
    const { event, tellUser } = (await response.json()) as {
      event: { eventId: string; end: string };
      tellUser: string;
    };
    createdEvents.push(event.eventId);
    expect(event.end).toBe("2026-11-12T19:30");
    expect(tellUser).toContain("1 hour");

    const found = (await (
      await agent(
        key,
        "GET",
        `/api/agent/events?from=2026-11-12&to=2026-11-12&q=${encodeURIComponent(TAG)}&memberIds=${memberId}`,
      )
    ).json()) as { total: number; occurrences: { eventId: string }[] };
    expect(found.total).toBe(1);
    expect(found.occurrences[0]?.eventId).toBe(event.eventId);
  });
});

describe("where an event comes from", () => {
  const messageId = `<${TAG}@mail.example>`;
  let eventId = "";

  beforeAll(async () => {
    const response = await agent(key, "POST", "/api/agent/events", {
      title: `${TAG} from a mail`,
      allDay: true,
      start: "2026-11-15",
      memberIds: [memberId],
      sourceRef: messageId,
    });
    eventId = ((await response.json()) as { event: { eventId: string } }).event.eventId;
    createdEvents.push(eventId);
  });

  it("finds the event by its sourceRef", async () => {
    const found = (await (
      await agent(
        key,
        "GET",
        `/api/agent/events?from=2026-11-01&to=2026-11-30&sourceRef=${encodeURIComponent(messageId)}`,
      )
    ).json()) as { total: number; occurrences: { eventId: string; sourceRef: string }[] };
    expect(found.total).toBe(1);
    expect(found.occurrences[0]).toMatchObject({ eventId, sourceRef: messageId });
  });

  it("returns one event by id, marked as created by this key only", async () => {
    const own = (await (await agent(key, "GET", `/api/agent/events/${eventId}`)).json()) as {
      createdByYou: boolean;
      sourceRef: string;
    };
    expect(own).toMatchObject({ createdByYou: true, sourceRef: messageId });

    const other = insertKey(`${TAG} other`);
    const theirs = (await (await agent(other, "GET", `/api/agent/events/${eventId}`)).json()) as {
      createdByYou: boolean;
    };
    expect(theirs.createdByYou).toBe(false);
  });

  it("answers an unknown event id with 404", async () => {
    const response = await agent(key, "GET", "/api/agent/events/nope");
    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe("not_found");
  });
});

describe("changing and deleting events", () => {
  async function createOwn(apiKey: string, body: Record<string, unknown> = {}) {
    const response = await agent(apiKey, "POST", "/api/agent/events", {
      title: `${TAG} own`,
      allDay: false,
      start: "2026-11-18T18:00",
      end: "2026-11-18T19:30",
      memberIds: [memberId],
      ...body,
    });
    const { event } = (await response.json()) as { event: { eventId: string } };
    createdEvents.push(event.eventId);
    return event.eventId;
  }

  const patch = (id: string, body: unknown, apiKey = key) =>
    agent(apiKey, "PATCH", `/api/agent/events/${id}`, body);

  it("moves the end along when only the start changes", async () => {
    const id = await createOwn(key);
    const response = await patch(id, { start: "2026-11-18T19:00" });
    expect(response.status).toBe(200);
    const { event, tellUser } = (await response.json()) as {
      event: { start: string; end: string };
      tellUser: string;
    };
    expect(event).toMatchObject({ start: "2026-11-18T19:00", end: "2026-11-18T20:30" });
    expect(tellUser).toContain("start");
  });

  it("refuses an empty change, a wrong format and an end before the start", async () => {
    const id = await createOwn(key);
    expect((await errorOf(await patch(id, {}))).code).toBe("validation_failed");
    expect((await errorOf(await patch(id, { allDay: true }))).issues?.[0]?.path).toBe("start");
    expect((await errorOf(await patch(id, { end: "2026-11-18T17:00" }))).issues?.[0]).toEqual({
      path: "end",
      message: "Must not be before start.",
    });
    expect((await errorOf(await patch(id, { location: "x" }))).issues?.[0]?.message).toBe(
      "Unknown field.",
    );
  });

  it("does not touch events of another key or of the family", async () => {
    const theirs = await createOwn(insertKey(`${TAG} owner`));
    const changed = await patch(theirs, { title: "x" });
    expect(changed.status).toBe(403);
    expect((await errorOf(changed)).code).toBe("not_own_event");
    expect((await agent(key, "DELETE", `/api/agent/events/${theirs}`)).status).toBe(403);

    // A family event of the test's own, never a real one: if the check broke, it would be changed
    const family = await createOwn(key);
    db.prepare("UPDATE events SET agent_key_id = NULL WHERE id = ?").run(family);
    expect((await patch(family, { title: "x" })).status).toBe(403);
  });

  it("deletes an own event while it is fresh, not later", async () => {
    const fresh = await createOwn(key);
    const own = (await (await agent(key, "GET", `/api/agent/events/${fresh}`)).json()) as {
      deletableUntil: string | null;
    };
    expect(own.deletableUntil).not.toBeNull();
    const deleted = await agent(key, "DELETE", `/api/agent/events/${fresh}`);
    expect(deleted.status).toBe(200);
    expect((await agent(key, "GET", `/api/agent/events/${fresh}`)).status).toBe(404);

    const old = await createOwn(key);
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60_000).toISOString();
    db.prepare("UPDATE events SET created_at = ? WHERE id = ?").run(twentyMinutesAgo, old);
    const late = await agent(key, "DELETE", `/api/agent/events/${old}`);
    expect(late.status).toBe(409);
    expect((await errorOf(late)).code).toBe("delete_window_closed");
  });
});
