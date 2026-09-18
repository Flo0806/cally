<script setup lang="ts">
import type { Occurrence } from "#shared/types";
import { dateOf } from "#shared/dates";
import { formatLongDate, formatShortDate, formatTime } from "~/utils/calendar";
import { useEventColor } from "~/composables/useEventColor";
import { useEventEditor } from "~/composables/useEventEditor";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ date: string; occurrences: Occurrence[] }>();

const colorOf = useEventColor();
const editor = useEventEditor();
const title = computed(() => (props.date ? formatLongDate(props.date) : ""));

// Two lines for the time column: the main value and a smaller qualifier
function when(occurrence: Occurrence): { main: string; sub: string } {
  const startDay = dateOf(occurrence.start);
  const endDay = dateOf(occurrence.end);
  if (startDay !== endDay) {
    return {
      main: "Ganztägig",
      sub: `${formatShortDate(startDay)} bis ${formatShortDate(endDay)}`,
    };
  }
  if (occurrence.allDay) return { main: "Ganztägig", sub: "" };
  return { main: formatTime(occurrence.start), sub: `bis ${formatTime(occurrence.end)}` };
}

function colorVar(occurrence: Occurrence): string {
  const color = colorOf(occurrence);
  return color ? `var(--event-${color})` : "var(--accent)";
}
</script>

<template>
  <AppDialog v-model="open" :title="title" width="600px">
    <ul v-if="occurrences.length" class="list">
      <li v-for="occurrence in occurrences" :key="occurrence.key">
        <button
          class="row"
          :style="{ '--row-color': colorVar(occurrence) }"
          type="button"
          @click="editor.openEdit(occurrence.eventId, occurrence.start)"
        >
          <span class="when">
            <span class="when-main tabular">{{ when(occurrence).main }}</span>
            <span v-if="when(occurrence).sub" class="when-sub tabular">{{
              when(occurrence).sub
            }}</span>
          </span>
          <span class="row-title">{{ occurrence.title }}</span>
          <svg
            v-if="occurrence.recurring"
            class="repeat"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-label="Wiederkehrend"
          >
            <path d="M17 2l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </li>
    </ul>
    <p v-else class="empty text-muted">Noch nichts geplant.</p>

    <template #actions>
      <button class="btn btn-primary" type="button" @click="editor.openNew(date)">+ Termin</button>
    </template>
  </AppDialog>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row {
  --row-color: var(--accent);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  height: 64px;
  padding: 0 var(--space-4) 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--row-color) 10%, var(--surface));
  box-shadow: inset 4px 0 0 var(--row-color);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    transform 80ms ease;
}

.row:active {
  background: color-mix(in srgb, var(--row-color) 20%, var(--surface));
  transform: scale(0.99);
}

.when {
  display: flex;
  flex-direction: column;
  flex: none;
  width: 96px;
  line-height: 1.2;
}

.when-main {
  font-size: var(--text-md);
  font-weight: 700;
}

.when-sub {
  font-size: var(--text-sm);
  color: var(--ink-muted);
}

.row-title {
  flex: 1;
  min-width: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repeat {
  flex: none;
  width: 20px;
  height: 20px;
  color: var(--ink-faint);
}

.empty {
  padding: var(--space-4) 0;
}
</style>
