import { defineEventHandler } from "nuxt/server";
import { revokeAgentKey } from "../../../database/agent-keys";
import { requireParam } from "../../../utils/validate";

export default defineEventHandler((event) => revokeAgentKey(requireParam(event, "id")));
