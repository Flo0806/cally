<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { WEEKDAY_LABELS, formatMonth, formatTime, today } from "~/utils/calendar";
import { useMonthOccurrences } from "~/composables/useMonthOccurrences";
import { useFitCount } from "~/composables/useFitCount";

const props = defineProps<{ month: Temporal.PlainYearMonth }>();
const emit = defineEmits<{ "update:month": [month: Temporal.PlainYearMonth] }>();

const title = computed(() => formatMonth(props.month));
const { days, chipsFor } = await useMonthOccurrences(toRef(props, "month"));

// All cells share one height, so measuring the first one is enough
const chipLists = useTemplateRef<HTMLElement[]>("chips");
const capacity = useFitCount(chipLists, { itemHeight: 26, gap: 3 });

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
        <button class="btn btn-icon" aria-label="Vorheriger Monat" @click="shift(-1)">‹</button>
        <button class="btn btn-ghost" @click="goToday">Heute</button>
        <button class="btn btn-icon" aria-label="Nächster Monat" @click="shift(1)">›</button>
      </div>
    </div>

    <div class="weekdays">
      <span v-for="label in WEEKDAY_LABELS" :key="label" class="weekday">{{ label }}</span>
    </div>

    <div class="grid">
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
        <ul ref="chips" class="chips">
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
          </li>
        </ul>
      </div>
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
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
