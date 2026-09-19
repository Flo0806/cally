import type { NewsHeart, NewsItem } from "#shared/types";
import { api } from "~/utils/api";

// Hearts of the current reader. Category counts rank the news page, they are not bookmarks.
export function useNewsHearts() {
  const hearts = useState<NewsHeart[]>("news:hearts", () => []);
  const loadedFor = useState<string | null>("news:hearts:member", () => null);

  const countByCategory = computed(() => {
    const counts = new Map<string, number>();
    for (const heart of hearts.value) {
      counts.set(heart.categoryId, (counts.get(heart.categoryId) ?? 0) + 1);
    }
    return counts;
  });

  async function load(memberId: string | null) {
    if (!memberId) {
      hearts.value = [];
      loadedFor.value = null;
      return;
    }
    if (loadedFor.value === memberId) return;
    hearts.value = await api<NewsHeart[]>("/api/news/hearts", { query: { memberId } });
    loadedFor.value = memberId;
  }

  function has(itemId: string): boolean {
    return hearts.value.some((h) => h.itemId === itemId);
  }

  async function toggle(item: NewsItem, categoryId: string, memberId: string) {
    if (has(item.id)) {
      await api(`/api/news/hearts/${item.id}`, { method: "DELETE", query: { memberId } });
      hearts.value = hearts.value.filter((h) => h.itemId !== item.id);
    } else {
      const created = await api<NewsHeart>(`/api/news/hearts/${item.id}`, {
        method: "PUT",
        body: { memberId, categoryId },
      });
      hearts.value = [created, ...hearts.value];
    }
  }

  async function resetCategory(categoryId: string, memberId: string) {
    await api("/api/news/hearts", { method: "DELETE", query: { memberId, categoryId } });
    hearts.value = hearts.value.filter((h) => h.categoryId !== categoryId);
  }

  return { hearts, countByCategory, load, has, toggle, resetCategory };
}
