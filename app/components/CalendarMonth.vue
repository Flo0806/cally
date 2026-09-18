<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { WEEKDAY_LABELS, formatMonth, monthGrid, today } from "~/utils/calendar";

const props = defineProps<{ month: Temporal.PlainYearMonth }>();
const emit = defineEmits<{ "update:month": [month: Temporal.PlainYearMonth] }>();

const title = computed(() => formatMonth(props.month));
const days = computed(() => monthGrid(props.month));

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
      >
        <span class="day-number tabular">{{ day.day }}</span>
      </div>
    </div>
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
  min-height: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--line);
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
  align-self: flex-start;
  min-width: 36px;
  height: 36px;
  padding: 0 var(--space-2);
  border-radius: 999px;
  font-size: var(--text-lg);
  font-weight: 600;
}

.day.today .day-number {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 700;
}
</style>
