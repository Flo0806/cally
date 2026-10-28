import { defineEventHandler } from "nuxt/server";
import type { RequestEvent } from "nuxt/server";
import { type AgentContext, agentOf } from "./door";
import { AgentError, agentError } from "./errors";

// Every agent route goes through here: a stack trace helps an attacker and is useless to a model
export function defineAgentHandler<T>(
  handler: (event: RequestEvent, agent: AgentContext) => T | Promise<T>,
) {
  return defineEventHandler(async (event) => {
    const agent = agentOf(event);
    // The door already checked, this only catches a route that escaped it
    if (!agent) {
      return agentError(401, { code: "missing_key", message: "No valid key on this request." });
    }
    try {
      return await handler(event, agent);
    } catch (error) {
      if (error instanceof AgentError) return agentError(error.status, error.body);
      console.error("[agent]", error);
      return agentError(500, {
        code: "internal_error",
        message: "Something went wrong on the server.",
        hint: "Retry once, then tell the user.",
      });
    }
  });
}
