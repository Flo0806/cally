<script setup lang="ts">
import { MapPin } from "@lucide/vue";
import { Temporal } from "temporal-polyfill";
import { Plus } from "@lucide/vue";
import { dateOf } from "#shared/dates";
import {
  WEEKDAY_LABELS,
  formatLongDate,
  formatMonth,
  formatShortDate,
  formatTime,
  today,
} from "~/utils/calendar";
import { useEventEditor } from "~/composables/useEventEditor";
import { useMonthOccurrences, type Chip } from "~/composables/useMonthOccurrences";
import { useFitCount } from "~/composables/useFitCount";

const props = defineProps<{ month: Temporal.PlainYearMonth }>();
const emit = defineEmits<{ "update:month": [month: Temporal.PlainYearMonth] }>();

const title = computed(() => formatMonth(props.month));
const { days, chipsFor } = await useMonthOccurrences(toRef(props, "month"));

// All cells share one height, so measuring the first chip list is enough
const grid = useTemplateRef<HTMLElement>("grid");
const capacity = useFitCount(grid, { item: ".chips", itemHeight: 26, gap: 3 });

const editor = useEventEditor();

// Phone: the month as an agenda, only days that have something
const agenda = computed(() =>
  days.value
    .filter((day) => day.inMonth)
    .map((day) => ({ day, chips: chipsFor(day.iso) }))
    .filter((entry) => entry.chips.length > 0),
);

function agendaWhen(chip: Chip): string {
  const o = chip.occurrence;
  if (dateOf(o.start) !== dateOf(o.end)) {
    return `${formatShortDate(dateOf(o.start))} bis ${formatShortDate(dateOf(o.end))}`;
  }
  return o.allDay ? "Ganztägig" : formatTime(o.start);
}

const selectedDay = ref<string | null>(null);
const dayOpen = computed({
  get: () => selectedDay.value !== null,
  set: (value) => {
    if (!value) selectedDay.value = null;
  },
});
const selectedOccurrences = computed(() =>
  selectedDay.value ? chipsFor(selectedDay.value).map((chip) => chip.occurrence) : [],
);

function shift(months: number) {
  emit("update:month", props.month.add({ months }));
}

function goToday() {
  emit("update:month", today().toPlainYearMonth());
}
</script>

<template>
  <section class="calendar">
    <div class="toolbar">
      <h2 class="title">{{ title }}</h2>
      <div class="nav">
        <button type="button" class="btn btn-icon" aria-label="Vorheriger Monat" @click="shift(-1)">
          ‹
        </button>
        <button type="button" class="btn btn-ghost" @click="goToday">Heute</button>
        <button type="button" class="btn btn-icon" aria-label="Nächster Monat" @click="shift(1)">
          ›
        </button>
      </div>
    </div>

    <div class="weekdays grid-view">
      <span v-for="label in WEEKDAY_LABELS" :key="label" class="weekday">{{ label }}</span>
    </div>

    <div ref="grid" class="grid grid-view">
      <div
        v-for="day in days"
        :key="day.iso"
        class="day"
        :class="{ outside: !day.inMonth, today: day.isToday, weekend: day.isWeekend }"
        role="button"
        tabindex="0"
        @click="selectedDay = day.iso"
        @keydown.enter="selectedDay = day.iso"
      >
        <div class="day-head">
          <span class="day-number tabular">{{ day.day }}</span>
          <span v-if="chipsFor(day.iso).length" class="badge tabular">
            {{ chipsFor(day.iso).length }}
          </span>
        </div>
        <ul class="chips">
          <li
            v-for="chip in chipsFor(day.iso).slice(0, capacity)"
            :key="chip.key"
            class="chip"
            :class="{ 'all-day': chip.occurrence.allDay, continues: chip.continues }"
            :style="chip.color ? { '--chip': `var(--event-${chip.color})` } : undefined"
          >
            <span v-if="!chip.occurrence.allDay" class="chip-time tabular">
              {{ formatTime(chip.occurrence.start) }}
            </span>
            <span class="chip-title">{{ chip.occurrence.title }}</span>
            <MapPin v-if="chip.occurrence.location" :size="12" class="chip-pin" />
          </li>
        </ul>
      </div>
    </div>

    <div class="agenda list-view">
      <template v-if="agenda.length">
        <section v-for="entry in agenda" :key="entry.day.iso" class="agenda-day">
          <div class="agenda-head" :class="{ today: entry.day.isToday }">
            <button class="agenda-date" type="button" @click="selectedDay = entry.day.iso">
              {{ formatLongDate(entry.day.iso) }}
            </button>
            <button
              class="btn btn-ghost btn-icon agenda-add"
              type="button"
              aria-label="Termin an diesem Tag"
              @click="editor.openNew(entry.day.iso)"
            >
              <Plus :size="20" />
            </button>
          </div>
          <ul class="agenda-list">
            <li v-for="chip in entry.chips" :key="chip.key">
              <button
                class="agenda-row"
                type="button"
                :style="{
                  '--row-color': chip.color ? `var(--event-${chip.color})` : 'var(--accent)',
                }"
                @click="editor.openEdit(chip.occurrence.eventId, chip.occurrence.start)"
              >
                <span class="agenda-when tabular">{{ agendaWhen(chip) }}</span>
                <span class="agenda-text">
                  <span class="agenda-title">{{ chip.occurrence.title }}</span>
                  <span v-if="chip.occurrence.location" class="agenda-location">
                    {{ chip.occurrence.location }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </template>
      <p v-else class="agenda-empty text-muted">Nichts geplant im {{ title }}.</p>
    </div>

    <DayDialog v-model="dayOpen" :date="selectedDay ?? ''" :occurrences="selectedOccurrences" />
  </section>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: var(--space-4) var(--space-5) var(--space-5);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.title {
  font-size: var(--text-2xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: capitalize;
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.weekdays {
  margin-bottom: var(--space-2);
}

.weekday {
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-muted);
}

.grid {
  flex: 1;
  min-height: 0;
  grid-auto-rows: 1fr;
  gap: 4px;
}

.day {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-height: 0;
  min-width: 0;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--line);
  overflow: hidden;
  cursor: pointer;
}

.day:active {
  background: var(--accent-soft);
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
}

.badge {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: var(--text-sm);
  font-weight: 700;
}

.day.weekend {
  background: var(--surface-muted);
}

.day.outside {
  opacity: 0.4;
}

.day-number {
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 var(--space-1);
  border-radius: 999px;
  font-size: var(--text-md);
  font-weight: 600;
}

.day.today .day-number {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 700;
}

.chips {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.chip {
  --chip: var(--accent);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: none;
  height: 26px;
  padding: 0 var(--space-2);
  border-radius: 6px;
  font-size: var(--text-sm);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}

/* Timed: light chip with a color edge. All-day: solid bar. */
.chip:not(.all-day) {
  background: color-mix(in srgb, var(--chip) 14%, var(--surface));
  box-shadow: inset 3px 0 0 var(--chip);
}

.chip.all-day {
  background: var(--chip);
  color: #fff;
  font-weight: 600;
}

.chip.all-day.continues {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -7px;
}

.chip-time {
  flex: none;
  font-weight: 600;
  color: var(--ink-muted);
}

.chip-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-pin {
  flex: none;
  opacity: 0.7;
}

/* Phone: the grid gives way to an agenda, the toolbar shrinks a notch */
.list-view {
  display: none;
}

@media (max-width: 639px) {
  .calendar {
    padding: var(--space-3) var(--space-3) var(--space-4);
    overflow-y: auto;
  }

  .toolbar {
    margin-bottom: var(--space-3);
  }

  .title {
    font-size: var(--text-xl);
  }

  .nav .btn {
    min-height: 44px;
  }

  .nav .btn-icon {
    width: 44px;
  }

  .grid-view {
    display: none;
  }

  .list-view {
    display: block;
  }
}

.agenda-day {
  margin-bottom: var(--space-4);
}

.agenda-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  background: var(--bg);
}

.agenda-date {
  flex: 1;
  min-height: 44px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-muted);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.agenda-head.today .agenda-date {
  color: var(--accent);
}

.agenda-add {
  width: 44px;
  min-height: 44px;
  color: var(--ink-faint);
}

.agenda-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.agenda-row {
  --row-color: var(--accent);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--row-color) 10%, var(--surface));
  box-shadow: inset 4px 0 0 var(--row-color);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.agenda-row:active {
  background: color-mix(in srgb, var(--row-color) 20%, var(--surface));
}

.agenda-when {
  flex: none;
  width: 84px;
  font-size: var(--text-sm);
  font-weight: 700;
}

.agenda-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.agenda-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-location {
  font-size: var(--text-sm);
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-empty {
  padding: var(--space-6) 0;
  text-align: center;
}
</style>
