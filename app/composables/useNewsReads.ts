import type { NewsItem } from "#shared/types";
import { api } from "~/utils/api";

// Items the current reader marked as read. Read items leave "Für dich" and dim elsewhere.
export function useNewsReads() {
  const ids = useState<Set<string>>("news:reads", () => new Set());
  const loadedFor = useState<string | null>("news:reads:member", () => null);

  async function load(memberId: string | null) {
    if (!memberId) {
      ids.value = new Set();
      loadedFor.value = null;
      return;
    }
    if (loadedFor.value === memberId) return;
    ids.value = new Set(await api<string[]>("/api/news/reads", { query: { memberId } }));
    loadedFor.value = memberId;
  }

  function has(itemId: string): boolean {
    return ids.value.has(itemId);
  }

  async function toggle(item: NewsItem, memberId: string) {
    const next = new Set(ids.value);
    if (next.has(item.id)) {
      await api(`/api/news/reads/${item.id}`, { method: "DELETE", query: { memberId } });
      next.delete(item.id);
    } else {
      await api(`/api/news/reads/${item.id}`, { method: "PUT", body: { memberId } });
      next.add(item.id);
    }
    ids.value = next;
  }

  return { ids, load, has, toggle };
}
