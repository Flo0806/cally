import { defineAgentHandler } from "../../agent/handler";
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

Key: "${agent.name}".
Every request sends the key as \`Authorization: Bearer ${AGENT_KEY_PREFIX}...\`. Bodies are JSON.

## Start here

1. \`GET /api/agent/members\` - the family members with their ids. Take ids from here, never
   guess one.

## Actions

| Request | Does |
| --- | --- |
| \`GET /api/agent\` | this manual |
| \`GET /api/agent/members\` | family members as \`[{ id, name }]\` |

## Rules

- **Limit per key:** 120 requests per minute (\`rate_limited\`). The header \`retry-after\` says
  how many seconds to wait. If you are repeating the same call, stop and tell the user instead.

## Errors

Every error has this shape:

\`\`\`json
{ "error": { "code": "not_found", "message": "...", "hint": "what to do next" } }
\`\`\`

| Code | Status | Meaning |
| --- | --- | --- |
| \`missing_key\`, \`invalid_key\`, \`key_revoked\` | 401 | ask the user for a valid key |
| \`not_found\` | 404 | no such action, see the list above |
| \`payload_too_large\` | 413 | the body is over 64 KB |
| \`rate_limited\` | 429 | wait, or stop |
| \`internal_error\` | 500 | retry once, then tell the user |
`;
});
