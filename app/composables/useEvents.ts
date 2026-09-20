import type { CalendarEvent } from "#shared/types";
import type { EventInput } from "#shared/schemas";
import { api } from "~/utils/api";

// Mutations announce themselves through the "cally:changed" hook; views reload on it
export function useEvents() {
  const nuxtApp = useNuxtApp();
  const changed = () => nuxtApp.callHook("cally:changed", "events");

  return {
    load: (id: string) => api<CalendarEvent>(`/api/events/${id}`),
    async save(input: EventInput, id?: string) {
      const saved = id
        ? await api<CalendarEvent>(`/api/events/${id}`, { method: "PUT", body: input })
        : await api<CalendarEvent>("/api/events", { method: "POST", body: input });
      await changed();
      return saved;
    },
    async remove(id: string) {
      await api(`/api/events/${id}`, { method: "DELETE" });
      await changed();
    },
    async removeOccurrence(id: string, start: string) {
      await api(`/api/events/${id}`, { method: "DELETE", query: { occurrence: start } });
      await changed();
    },
  };
}
