export type AgentErrorCode =
  | "missing_key"
  | "invalid_key"
  | "key_revoked"
  | "rate_limited"
  | "payload_too_large";

export interface AgentErrorBody {
  code: AgentErrorCode;
  message: string;
  hint?: string;
}

// One shape for every refusal, written for a model: `code` to branch on, `hint` for the next step
export function agentError(status: number, error: AgentErrorBody, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}
