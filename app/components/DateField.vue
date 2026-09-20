<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { Temporal } from "temporal-polyfill";
import { WEEKDAY_LABELS, formatMonth, monthGrid, today } from "~/utils/calendar";

// Our own date picker: one tap on a day picks it. Same grid as the calendar, no events.
const model = defineModel<string>({ required: true });
defineProps<{ id?: string; label?: string; placeholder?: string }>();

const open = ref(false);
// shallowRef: Temporal objects carry internal slots and must not be wrapped in a reactive proxy
const month = shallowRef(today().toPlainYearMonth());

const days = computed(() => monthGrid(month.value));
const title = computed(() => formatMonth(month.value));

const display = computed(() => {
  if (!model.value) return "";
  return Temporal.PlainDate.from(model.value).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
});

function show() {
  const date = model.value ? Temporal.PlainDate.from(model.value) : today();
  month.value = date.toPlainYearMonth();
  open.value = true;
}

function shift(months: number) {
  month.value = month.value.add({ months });
}

function pick(iso: string) {
  model.value = iso;
  open.value = false;
}

function pickToday() {
  pick(today().toString());
}
</script>

<template>
  <button :id="id" class="input date-field" type="button" :aria-label="label" @click="show">
    {{ display || placeholder || "Datum wählen" }}
  </button>

  <AppDialog v-model="open" :title="label ?? 'Datum'" width="520px">
    <div class="toolbar">
      <button class="btn btn-icon" type="button" aria-label="Vorheriger Monat" @click="shift(-1)">
        <ChevronLeft :size="22" />
      </button>
      <span class="month">{{ title }}</span>
      <button class="btn btn-icon" type="button" aria-label="Nächster Monat" @click="shift(1)">
        <ChevronRight :size="22" />
      </button>
    </div>

    <div class="weekdays">
      <span v-for="w in WEEKDAY_LABELS" :key="w" class="weekday">{{ w }}</span>
    </div>
    <div class="grid">
      <button
        v-for="day in days"
        :key="day.iso"
        class="day tabular"
        :class="{
          outside: !day.inMonth,
          today: day.isToday,
          on: day.iso === model,
          weekend: day.isWeekend,
        }"
        type="button"
        @click="pick(day.iso)"
      >
        {{ day.day }}
      </button>
    </div>

    <template #actions>
      <button class="btn btn-ghost" type="button" @click="pickToday">Heute</button>
      <button class="btn btn-ghost" type="button" @click="open = false">Abbrechen</button>
    </template>
  </AppDialog>
</template>

<style scoped>
.date-field {
  flex: 1;
  min-width: 0;
  width: auto;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.month {
  font-size: var(--text-lg);
  font-weight: 700;
  text-transform: capitalize;
}

.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
}

.weekday {
  padding-bottom: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-muted);
  text-align: center;
}

.day {
  height: 52px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--ink);
  font-size: var(--text-lg);
  font-weight: 600;
  cursor: pointer;
}

.day:active {
  background: var(--accent-soft);
}

.day.weekend {
  background: var(--surface-muted);
}

.day.outside {
  opacity: 0.35;
}

.day.today {
  border-color: var(--accent);
  color: var(--accent);
}

.day.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
}
</style>
