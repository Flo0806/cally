import { Temporal } from "temporal-polyfill";
import { TIME_ZONE } from "#shared/dates";
import { defineAgentHandler } from "../../agent/handler";
import { DELETE_WINDOW_MINUTES, MAX_SEARCH_DAYS, MAX_SEARCH_RESULTS } from "../../agent/events";
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

1. \`GET /api/agent/members\` and \`GET /api/agent/categories\` - the family members and the
   categories with their ids. Take ids from here, never guess one.
2. \`GET /api/agent/events?from=...&to=...\` - what is in the calendar. Look before you answer a
   question about the user's time, and search before you create, so you do not add a duplicate.
   For an event from a mail, search with \`sourceRef\` set to its Message-ID first.

## Actions

| Request | Does |
| --- | --- |
| \`GET /api/agent\` | this manual |
| \`GET /api/agent/members\` | family members as \`[{ id, name }]\` |
| \`GET /api/agent/categories\` | categories as \`[{ id, name }]\` |
| \`GET /api/agent/events?from=&to=&q=&memberIds=&sourceRef=\` | events in a date range, optionally filtered |
| \`GET /api/agent/events/{eventId}\` | one event |
| \`POST /api/agent/events\` | create an event |
| \`PATCH /api/agent/events/{eventId}\` | change an event you created |
| \`DELETE /api/agent/events/{eventId}\` | delete an event you created, within ${DELETE_WINDOW_MINUTES} minutes |

## Searching events

- \`from\`, \`to\` - required, \`YYYY-MM-DD\`, both days included, at most ${MAX_SEARCH_DAYS} days apart.
  "The next three weeks" is today until today + 20 days. Dates are local time in Europe/Berlin.
- \`q\` - optional, matches title, notes and location, ignoring case: \`q=nuxt\`.
- \`memberIds\` - optional, comma separated ids from \`/api/agent/members\`. An event matches when
  at least one of them takes part. Events for the whole family have no members and do not match.
- \`sourceRef\` - optional, exact match on what you stored when creating, e.g. a mail's Message-ID.

The answer is \`{ from, to, total, truncated, occurrences }\`, sorted by start. A recurring event
appears once per date it falls on, with the same \`eventId\`. Each occurrence is an event:

- \`eventId\`, \`title\`, \`allDay\`, \`start\`, \`end\`, \`recurring\`, \`location\`, \`notes\`
- \`members\` as \`[{ id, name }]\`, \`category\` as \`{ id, name }\` or null
- \`sourceRef\` - what it was created from, null when it was made in the app
- \`createdByYou\` - true when this key created it; only then can you change it
- \`deletableUntil\` - until when you can delete it, null when you cannot

\`GET /api/agent/events/{eventId}\` returns one event in the same shape. All-day events have dates (\`2026-11-03\`), the others local
date-times (\`2026-11-03T18:30\`). At most ${MAX_SEARCH_RESULTS} are returned; when \`truncated\`
is true, search a shorter range.

## Creating events

\`POST /api/agent/events\` with a JSON body:

- \`title\` - required, one line, at most 120 characters.
- \`allDay\` - required, true or false.
- \`start\` - required. All-day: \`YYYY-MM-DD\`. Otherwise local time: \`YYYY-MM-DDTHH:mm\`.
- \`end\` - optional, same format, not before \`start\`, inclusive for all-day events. Without it
  an all-day event lasts that one day and a timed event one hour.
- \`memberIds\` - required, at least one id from \`/api/agent/members\`: who the event is for.
- \`categoryId\` - optional, an id from \`/api/agent/categories\`, or null for none.
- \`notes\` - optional, plain text, at most 2000 characters.
- \`sourceRef\` - optional, at most 300 characters: where the event comes from, e.g. the
  Message-ID of the mail that announced it. Set it whenever there is one.

Location and repetition cannot be set here. If the user asked for one, create the event without
it and tell them to add it in the app.

**Categories:** pick an existing one when it clearly fits, e.g. a business appointment into the
category for the company. If none fits, set none. You cannot create categories, and the family
keeps them few on purpose; if the same kind of event keeps coming without a fitting category,
suggest one to the user once.

The answer (201) is \`{ event, tellUser }\`: the event as stored, and one sentence saying what
you did. Pass \`tellUser\` on to the user.

\`\`\`http
POST /api/agent/events
Authorization: Bearer ${AGENT_KEY_PREFIX}...
Content-Type: application/json

{ "title": "Nuxt Meetup", "allDay": false, "start": "2026-11-12T18:30", "end": "2026-11-12T21:00",
  "memberIds": ["<id from /api/agent/members>"] }
\`\`\`

## Changing and deleting events

Only events you created (\`createdByYou\`). Everything else belongs to the family: tell the user
what should change instead (\`not_own_event\`).

\`PATCH /api/agent/events/{eventId}\` takes the fields of a new event except \`sourceRef\`, all
optional; send only what changes. A new \`start\` without \`end\` moves the end along and keeps
the length. Switching \`allDay\` needs a \`start\` in the other format. \`categoryId: null\`
removes the category. Location and repetition the family added in the app stay. The answer is \`{ event, tellUser }\`.

\`DELETE /api/agent/events/{eventId}\` is for your own mistakes, within ${DELETE_WINDOW_MINUTES} minutes of
creating the event (\`delete_window_closed\`). After that the family may already rely on it: tell
the user and let them delete it in the app. The answer is \`{ deleted, tellUser }\`.

## Rules

- **Do not guess.** Answer from what the API returned. If nothing matched, say so, and say which
  range and filter you searched. Create an event only with a date, time and members the user
  gave you or that are beyond doubt; otherwise ask.
- **Tell the user what you did.** After every create, change and delete, pass \`tellUser\` on.
  The family sees it on the kitchen tablet at once.
- Unknown fields are refused, not ignored. If a call fails, read \`issues\`, fix exactly those
  fields, and try once more.
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
| \`unknown_category\` | 400 | a category id is unknown, take ids from \`/api/agent/categories\` |
| \`not_own_event\` | 403 | not created with your key, tell the user |
| \`not_found\` | 404 | no such action or event |
| \`delete_window_closed\` | 409 | too late to delete, tell the user |
| \`payload_too_large\` | 413 | the body is over 64 KB |
| \`rate_limited\` | 429 | wait, or stop |
| \`internal_error\` | 500 | retry once, then tell the user |
`;
});
