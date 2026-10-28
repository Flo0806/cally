import { defineAgentHandler } from "../../../agent/handler";
import { eventPatchBody, updateAgentEvent } from "../../../agent/events";
import { parseAgentInput, readAgentBody } from "../../../agent/validate";
import { notifyChange } from "../../../live/bus";
import { requireParam } from "../../../utils/validate";

export default defineAgentHandler(async (event, agent) => {
  const body = parseAgentInput(eventPatchBody, await readAgentBody(event));
  const result = await updateAgentEvent(requireParam(event, "id"), body, agent);
  notifyChange(event, "events");
  return result;
});
