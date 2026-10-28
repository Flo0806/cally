import { defineAgentHandler } from "../../../agent/handler";
import { deleteAgentEvent } from "../../../agent/events";
import { notifyChange } from "../../../live/bus";
import { requireParam } from "../../../utils/validate";

export default defineAgentHandler(async (event, agent) => {
  const result = await deleteAgentEvent(requireParam(event, "id"), agent);
  notifyChange(event, "events");
  return result;
});
