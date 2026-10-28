import { setResponseStatus } from "nuxt/server";
import { defineAgentHandler } from "../../agent/handler";
import { createAgentEvent, eventCreateBody } from "../../agent/events";
import { parseAgentInput, readAgentBody } from "../../agent/validate";
import { notifyChange } from "../../live/bus";

export default defineAgentHandler(async (event, agent) => {
  const body = parseAgentInput(eventCreateBody, await readAgentBody(event));
  const result = await createAgentEvent(body, agent);
  notifyChange(event, "events");
  setResponseStatus(event, 201);
  return result;
});
