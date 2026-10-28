import { defineEventHandler } from "nuxt/server";
import { listAgentKeys } from "../../database/agent-keys";

export default defineEventHandler(() => listAgentKeys());
