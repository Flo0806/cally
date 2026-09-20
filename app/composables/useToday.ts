import type { Today } from "#shared/types";
import { api } from "~/utils/api";

// Today's events with departure times, shared by the header count and the drawer
export function useToday() {
  const data = useState<Today | null>("today", () => null);
  const loadedAt = useState<number>("today:loadedAt", () => 0);

  async function load(force = false) {
    if (!force && data.value && Date.now() - loadedAt.value < 60_000) return;
    data.value = await api<Today>("/api/today");
    loadedAt.value = Date.now();
  }

  // Any event change may move today's list
  useRuntimeHook("cally:changed", (what) => {
    if (what === "events") return load(true);
  });

  return { data, load };
}
