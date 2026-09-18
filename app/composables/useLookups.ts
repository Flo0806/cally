import type { Lookup } from "#shared/types";
import type { LookupInput, LookupPatch } from "#shared/schemas";
import { api } from "~/utils/api";

export type LookupKind = "members" | "categories";

// App wide cache per kind, so the dialog and the calendar see the same list
export function useLookups(kind: LookupKind) {
  const items = useState<Lookup[]>(`lookups:${kind}`, () => []);
  const loaded = useState(`lookups:${kind}:loaded`, () => false);

  async function load(force = false) {
    if (loaded.value && !force) return;
    items.value = await api<Lookup[]>(`/api/${kind}`);
    loaded.value = true;
  }

  async function create(input: LookupInput) {
    const created = await api<Lookup>(`/api/${kind}`, { method: "POST", body: input });
    items.value = [...items.value, created];
    return created;
  }

  async function update(id: string, patch: LookupPatch) {
    const updated = await api<Lookup>(`/api/${kind}/${id}`, { method: "PATCH", body: patch });
    items.value = items.value.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async function remove(id: string) {
    await api(`/api/${kind}/${id}`, { method: "DELETE" });
    items.value = items.value.filter((item) => item.id !== id);
  }

  return { items, load, create, update, remove };
}
