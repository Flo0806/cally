import { defineAgentHandler } from "../../../agent/handler";
import { getAgentEvent } from "../../../agent/events";
import { requireParam } from "../../../utils/validate";

export default defineAgentHandler((event, agent) =>
  getAgentEvent(requireParam(event, "id"), agent),
);
