<script setup lang="ts">
import type { Occurrence } from "#shared/types";
import { dateOf } from "#shared/dates";
import { formatLongDate, formatShortDate, formatTime } from "~/utils/calendar";
import { useEventColor } from "~/composables/useEventColor";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ date: string; occurrences: Occurrence[] }>();

const colorOf = useEventColor();
const title = computed(() => (props.date ? formatLongDate(props.date) : ""));

function when(occurrence: Occurrence): string {
  const startDay = dateOf(occurrence.start);
  const endDay = dateOf(occurrence.end);
  if (startDay !== endDay) return `${formatShortDate(startDay)} – ${formatShortDate(endDay)}`;
  if (occurrence.allDay) return "Ganztägig";
  return `${formatTime(occurrence.start)} – ${formatTime(occurrence.end)}`;
}
</script>

<template>
  <AppDialog v-model="open" :title="title" width="560px">
    <ul v-if="occurrences.length" class="list">
      <li v-for="occurrence in occurrences" :key="occurrence.key" class="row">
        <span
          class="dot"
          :style="{
            background: colorOf(occurrence)
              ? `var(--event-${colorOf(occurrence)})`
              : 'var(--accent)',
          }"
        />
        <span class="when tabular">{{ when(occurrence) }}</span>
        <span class="row-title">{{ occurrence.title }}</span>
      </li>
    </ul>
    <p v-else class="text-muted">Keine Termine an diesem Tag.</p>
  </AppDialog>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.dot {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.when {
  flex: none;
  min-width: 118px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-muted);
}

.row-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
