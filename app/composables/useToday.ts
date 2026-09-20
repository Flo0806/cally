import type { Today } from "#shared/types";
import { api } from "~/utils/api";
import { useEvents } from "~/composables/useEvents";

// Today's events with departure times, shared by the header count and the drawer
export function useToday() {
  const data = useState<Today | null>("today", () => null);
  const loadedAt = useState<number>("today:loadedAt", () => 0);
  const { version } = useEvents();

  async function load(force = false) {
    if (!force && data.value && Date.now() - loadedAt.value < 60_000) return;
    data.value = await api<Today>("/api/today");
    loadedAt.value = Date.now();
  }

  // Any event change may move today's list
  watch(version, () => load(true));

  return { data, load };
}
