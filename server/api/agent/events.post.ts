import { readBody, setResponseStatus } from "nuxt/server";
import { defineAgentHandler } from "../../agent/handler";
import { AgentError } from "../../agent/errors";
import { createAgentEvent, eventCreateBody } from "../../agent/events";
import { parseAgentInput } from "../../agent/validate";
import { notifyChange } from "../../live/bus";

export default defineAgentHandler(async (event) => {
  const body = await readBody(event).catch(() => {
    throw new AgentError(400, {
      code: "validation_failed",
      message: "The body is not valid JSON.",
      hint: 'Send a JSON object with "Content-Type: application/json".',
    });
  });
  const result = await createAgentEvent(parseAgentInput(eventCreateBody, body));
  notifyChange(event, "events");
  setResponseStatus(event, 201);
  return result;
});
