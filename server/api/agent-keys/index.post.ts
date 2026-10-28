import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { agentKeyInput } from "#shared/schemas";
import { createAgentKey } from "../../database/agent-keys";
import { readValidatedBody } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const { name } = await readValidatedBody(event, agentKeyInput);
  const created = await createAgentKey(name);
  setResponseStatus(event, 201);
  return created;
});
