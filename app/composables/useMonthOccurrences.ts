import { Temporal } from "temporal-polyfill";
import type { Occurrence } from "#shared/types";
import { dateOf } from "#shared/dates";
import { monthGrid } from "~/utils/calendar";
import { useApi } from "~/utils/api";
import { useEventColor } from "~/composables/useEventColor";

// One line in a day cell. Multi-day occurrences appear on every day they cover,
// `continues` marks all but the first.
export interface Chip {
  key: string;
  occurrence: Occurrence;
  continues: boolean;
  color: string | null;
}

export async function useMonthOccurrences(month: Ref<Temporal.PlainYearMonth>) {
  const days = computed(() => monthGrid(month.value));
  const from = computed(() => days.value[0]!.iso);
  const to = computed(() => days.value[days.value.length - 1]!.iso);

  // Before the await: Nuxt composables need the instance context, which is gone after it
  const colorOf = useEventColor();

  // Exactly the visible grid, refetched when the month changes
  const { data: occurrences, refresh } = await useApi("/api/events", { query: { from, to } });

  const chipsByDay = computed(() => {
    const map = new Map<string, Chip[]>();
    for (const occurrence of occurrences.value ?? []) {
      const first = Temporal.PlainDate.from(dateOf(occurrence.start));
      const last = Temporal.PlainDate.from(dateOf(occurrence.end));
      for (
        let day = first;
        Temporal.PlainDate.compare(day, last) <= 0;
        day = day.add({ days: 1 })
      ) {
        const iso = day.toString();
        if (iso < from.value || iso > to.value) continue;
        const chips = map.get(iso) ?? [];
        chips.push({
          key: occurrence.key,
          occurrence,
          continues: !day.equals(first),
          color: colorOf(occurrence),
        });
        map.set(iso, chips);
      }
    }
    return map;
  });

  function chipsFor(iso: string): Chip[] {
    return chipsByDay.value.get(iso) ?? [];
  }

  return { days, chipsFor, refresh };
}
