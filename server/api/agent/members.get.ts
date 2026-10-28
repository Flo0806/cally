import { listLookups } from "../../database/lookups";
import { defineAgentHandler } from "../../agent/handler";

// Names and ids only, colors and phone topics are none of the agent's business
export default defineAgentHandler(async () => {
  const members = await listLookups("members");
  return members.map(({ id, name }) => ({ id, name }));
});
