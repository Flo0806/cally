import * as v from "valibot";
import { AgentError } from "./errors";

// valibot reports a missing and an unknown key as the same issue type, only `expected` differs
function messageOf(issue: v.BaseIssue<unknown>): string {
  if (issue.type !== "strict_object") return issue.message;
  return issue.expected === "never" ? "Unknown field." : "Required.";
}

// Each issue names the field and what is allowed, so the agent fixes exactly that
export function parseAgentInput<TSchema extends v.GenericSchema>(
  schema: TSchema,
  input: unknown,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);
  if (result.success) return result.output;
  throw new AgentError(400, {
    code: "validation_failed",
    message: "The request has invalid fields.",
    hint: "Fix exactly the fields in issues and try once more.",
    issues: result.issues.map((issue) => ({
      path: v.getDotPath(issue) ?? "",
      message: messageOf(issue),
    })),
  });
}
