import { Temporal } from "temporal-polyfill";
import { TIME_ZONE } from "#shared/dates";
import { defineAgentHandler } from "../../agent/handler";
import { MAX_SEARCH_DAYS, MAX_SEARCH_RESULTS } from "../../agent/events";
import { agentNotFound } from "../../agent/errors";
import { AGENT_KEY_PREFIX } from "../../database/agent-keys";

// The first call an agent makes. Markdown, because a model reads prose better than a schema.
// It only describes what the server does, every route listed here exists. All methods land
// here because the catch-all does not match the bare path.
export default defineAgentHandler((event, agent) => {
  if (event.req.method !== "GET") throw agentNotFound(event.req.method, event.url.pathname);
  event.res.headers.set("content-type", "text/markdown; charset=utf-8");
  return `# cally agent API

You are connected to cally, the family calendar of the user, as their personal AI agent.

Key: "${agent.name}". Today is ${Temporal.Now.plainDateISO(TIME_ZONE)} (Europe/Berlin).
Every request sends the key as \`Authorization: Bearer ${AGENT_KEY_PREFIX}...\`. Bodies are JSON.

## Start here

1. \`GET /api/agent/members\` - the family members with their ids. Take ids from here, never
   guess one.
2. \`GET /api/agent/events?from=...&to=...\` - what is in the calendar. Look before you answer a
   question about the user's time.

## Actions

| Request | Does |
| --- | --- |
| \`GET /api/agent\` | this manual |
| \`GET /api/agent/members\` | family members as \`[{ id, name }]\` |
| \`GET /api/agent/events?from=&to=&q=&memberIds=\` | events in a date range, optionally filtered |

## Searching events

- \`from\`, \`to\` - required, \`YYYY-MM-DD\`, both days included, at most ${MAX_SEARCH_DAYS} days apart.
  "The next three weeks" is today until today + 20 days. Dates are local time in Europe/Berlin.
- \`q\` - optional, matches title, notes and location, ignoring case: \`q=nuxt\`.
- \`memberIds\` - optional, comma separated ids from \`/api/agent/members\`. An event matches when
  at least one of them takes part. Events for the whole family have no members and do not match.

The answer is \`{ from, to, total, truncated, occurrences }\`, sorted by start. A recurring event
appears once per date it falls on, with the same \`eventId\`. Each occurrence has \`eventId\`,
\`title\`, \`allDay\`, \`start\`, \`end\`, \`recurring\`, \`members\` as \`[{ id, name }]\`,
\`location\` and \`notes\`. All-day events have dates (\`2026-11-03\`), the others local
date-times (\`2026-11-03T18:30\`). At most ${MAX_SEARCH_RESULTS} are returned; when \`truncated\`
is true, search a shorter range.

## Rules

- **Do not guess.** Answer from what the API returned. If nothing matched, say so, and say which
  range and filter you searched.
- **Limit per key:** 120 requests per minute (\`rate_limited\`). The header \`retry-after\` says
  how many seconds to wait. If you are repeating the same call, stop and tell the user instead.

## Errors

Every error has this shape:

\`\`\`json
{ "error": { "code": "validation_failed", "message": "...", "hint": "what to do next",
  "issues": [{ "path": "to", "message": "Must not be before from." }] } }
\`\`\`

| Code | Status | Meaning |
| --- | --- | --- |
| \`missing_key\`, \`invalid_key\`, \`key_revoked\` | 401 | ask the user for a valid key |
| \`validation_failed\` | 400 | fix the fields in \`issues\` |
| \`unknown_member\` | 400 | a member id is unknown, take ids from \`/api/agent/members\` |
| \`not_found\` | 404 | no such action, see the list above |
| \`payload_too_large\` | 413 | the body is over 64 KB |
| \`rate_limited\` | 429 | wait, or stop |
| \`internal_error\` | 500 | retry once, then tell the user |
`;
});
