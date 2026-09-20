<script setup lang="ts">
import { Temporal } from "temporal-polyfill";

// Our own time picker: the WebView's system dialog clips its buttons in landscape.
// Hours as tiles, minutes in quarters plus five minute nudges, apply confirms.
const model = defineModel<string>({ required: true });
defineProps<{ id?: string; label?: string }>();

const open = ref(false);
const hour = ref(9);
const minute = ref(0);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const QUARTERS = [0, 15, 30, 45];

const preview = computed(
  () => `${String(hour.value).padStart(2, "0")}:${String(minute.value).padStart(2, "0")}`,
);

function show() {
  const time = Temporal.PlainTime.from(model.value || "09:00");
  hour.value = time.hour;
  minute.value = time.minute;
  open.value = true;
}

function nudge(delta: number) {
  const next = Temporal.PlainTime.from({ hour: hour.value, minute: minute.value }).add({
    minutes: delta,
  });
  hour.value = next.hour;
  minute.value = next.minute;
}

function apply() {
  model.value = preview.value;
  open.value = false;
}
</script>

<template>
  <button :id="id" class="input time-field tabular" type="button" :aria-label="label" @click="show">
    {{ model || "–:–" }}
  </button>

  <AppDialog v-model="open" :title="label ?? 'Uhrzeit'" width="520px">
    <div class="preview tabular">{{ preview }}</div>

    <div class="group">
      <span class="field-label">Stunde</span>
      <div class="hours">
        <button
          v-for="h in HOURS"
          :key="h"
          class="tile tabular"
          :class="{ on: h === hour }"
          type="button"
          @click="hour = h"
        >
          {{ h }}
        </button>
      </div>
    </div>

    <div class="group">
      <span class="field-label">Minute</span>
      <div class="minutes">
        <button
          v-for="m in QUARTERS"
          :key="m"
          class="tile wide tabular"
          :class="{ on: m === minute }"
          type="button"
          @click="minute = m"
        >
          {{ String(m).padStart(2, "0") }}
        </button>
        <button class="tile nudge tabular" type="button" @click="nudge(-5)">−5</button>
        <button class="tile nudge tabular" type="button" @click="nudge(5)">+5</button>
      </div>
    </div>

    <template #actions>
      <button class="btn btn-ghost" type="button" @click="open = false">Abbrechen</button>
      <button class="btn btn-primary" type="button" @click="apply">Übernehmen</button>
    </template>
  </AppDialog>
</template>

<style scoped>
.time-field {
  width: 112px;
  flex: none;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}

.preview {
  margin-bottom: var(--space-4);
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  text-align: center;
  color: var(--accent);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.hours {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-2);
}

.minutes {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 64px 64px;
  gap: var(--space-2);
}

.tile {
  min-height: 52px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--text-lg);
  font-weight: 600;
  cursor: pointer;
}

.tile:active {
  transform: scale(0.96);
}

.tile.on {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}

.nudge {
  color: var(--ink-muted);
}
</style>
