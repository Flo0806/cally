import type { AgentKey } from "#shared/types";
import { api, useApi } from "~/utils/api";

export function useAgentKeys() {
  const { data, refresh } = useApi("/api/agent-keys", {
    key: "agent-keys",
    default: () => [] as AgentKey[],
  });

  // Returns the plain key, the only time the client ever sees it
  async function create(name: string): Promise<string> {
    const { key } = await api<{ key: string; agentKey: AgentKey }>("/api/agent-keys", {
      method: "POST",
      body: { name },
    });
    await refresh();
    return key;
  }

  async function revoke(id: string) {
    await api(`/api/agent-keys/${id}/revoke`, { method: "POST" });
    await refresh();
  }

  return { keys: data, create, revoke };
}
