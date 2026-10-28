export type AgentErrorCode =
  | "missing_key"
  | "invalid_key"
  | "key_revoked"
  | "rate_limited"
  | "payload_too_large"
  | "not_found"
  | "internal_error";

export interface AgentErrorBody {
  code: AgentErrorCode;
  message: string;
  hint?: string;
}

// One shape for every refusal, written for a model: `code` to branch on, `hint` for the next step
export function agentError(status: number, error: AgentErrorBody, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}

// Thrown inside an agent route, turned into the shape above by `defineAgentHandler`
export class AgentError extends Error {
  constructor(
    readonly status: number,
    readonly body: AgentErrorBody,
  ) {
    super(body.message);
  }
}

export function agentNotFound(method: string, path: string): AgentError {
  return new AgentError(404, {
    code: "not_found",
    message: `There is no ${method} ${path}.`,
    hint: "GET /api/agent describes every action this API offers.",
  });
}
