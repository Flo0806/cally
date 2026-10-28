import { defineAgentHandler } from "../../agent/handler";
import { agentNotFound } from "../../agent/errors";

// Without this an unknown agent path falls through to the page renderer and redirects to /login
export default defineAgentHandler((event) => {
  throw agentNotFound(event.req.method, event.url.pathname);
});
