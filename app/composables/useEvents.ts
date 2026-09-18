import type { CalendarEvent } from "#shared/types";
import type { EventInput } from "#shared/schemas";
import { api } from "~/utils/api";

// Mutations bump `version`; views holding occurrences watch it and reload
export function useEvents() {
  const version = useState("events:version", () => 0);

  function changed() {
    version.value++;
  }

  return {
    version,
    load: (id: string) => api<CalendarEvent>(`/api/events/${id}`),
    async save(input: EventInput, id?: string) {
      const saved = id
        ? await api<CalendarEvent>(`/api/events/${id}`, { method: "PUT", body: input })
        : await api<CalendarEvent>("/api/events", { method: "POST", body: input });
      changed();
      return saved;
    },
    async remove(id: string) {
      await api(`/api/events/${id}`, { method: "DELETE" });
      changed();
    },
    async removeOccurrence(id: string, start: string) {
      await api(`/api/events/${id}`, { method: "DELETE", query: { occurrence: start } });
      changed();
    },
  };
}
