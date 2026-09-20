<script setup lang="ts">
import { Check, Loader2, MapPin, X } from "@lucide/vue";
import type { Place } from "#shared/types";
import { api } from "~/utils/api";

// A place is either resolved to coordinates or empty. The text is checked when the field is
// left or when the form saves, and the result is shown right in the field.
export type PlaceStatus = "empty" | "unchecked" | "checking" | "valid" | "invalid";

const text = defineModel<string>({ required: true });
const place = defineModel<Place | null>("place", { required: true });
const status = defineModel<PlaceStatus>("status", { required: true });
defineProps<{ id: string }>();

const suggestions = ref<Place[]>([]);
const open = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let lastQuery = "";
let inFlight: Promise<boolean> | null = null;

async function search(query: string): Promise<Place[]> {
  try {
    return await api<Place[]>("/api/geo/search", { query: { q: query } });
  } catch {
    return [];
  }
}

function onInput() {
  place.value = null;
  const query = text.value.trim();
  status.value = query ? "unchecked" : "empty";
  clearTimeout(timer);
  if (query.length < 3) {
    suggestions.value = [];
    open.value = false;
    return;
  }
  timer = setTimeout(async () => {
    lastQuery = query;
    const places = await search(query);
    if (lastQuery !== query) return;
    suggestions.value = places;
    open.value = places.length > 0;
  }, 300);
}

function pick(found: Place) {
  text.value = found.label;
  place.value = found;
  status.value = "valid";
  suggestions.value = [];
  open.value = false;
}

// Resolves the typed text once. Returns whether the field is acceptable for saving.
function check(): Promise<boolean> {
  const query = text.value.trim();
  if (!query) {
    status.value = "empty";
    return Promise.resolve(true);
  }
  if (status.value === "valid") return Promise.resolve(true);
  if (inFlight) return inFlight;
  status.value = "checking";
  inFlight = (async () => {
    const [best] = await search(query);
    // The text may have changed while we waited, then this result is stale
    if (text.value.trim() !== query) return status.value === "valid";
    if (best) {
      // The field shows what was actually found, not what was typed
      text.value = best.label;
      place.value = best;
      status.value = "valid";
      return true;
    }
    place.value = null;
    status.value = "invalid";
    return false;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function onBlur() {
  setTimeout(() => (open.value = false), 150);
  if (status.value === "unchecked") void check();
}

defineExpose({ check });
</script>

<template>
  <div class="place">
    <div class="place-field" :class="status">
      <MapPin :size="20" class="place-icon" />
      <input
        :id="id"
        v-model="text"
        class="input"
        autocomplete="off"
        placeholder="Adresse oder Ort"
        enterkeyhint="done"
        @input="onInput"
        @focus="suggestions.length && (open = true)"
        @blur="onBlur"
      />
      <span class="place-state" aria-live="polite">
        <Loader2 v-if="status === 'checking'" :size="20" class="spin" />
        <Check v-else-if="status === 'valid'" :size="20" class="ok" aria-label="Ort gefunden" />
        <X
          v-else-if="status === 'invalid'"
          :size="20"
          class="bad"
          aria-label="Ort nicht gefunden"
        />
      </span>
    </div>
    <ul v-if="open" class="suggestions card">
      <li v-for="found in suggestions" :key="found.label">
        <button class="suggestion" type="button" @mousedown.prevent="pick(found)">
          {{ found.label }}
        </button>
      </li>
    </ul>
    <p v-if="status === 'invalid'" class="note bad">Ort nicht gefunden.</p>
  </div>
</template>

<style scoped>
.place {
  position: relative;
}

.place-field {
  position: relative;
}

.place-icon {
  position: absolute;
  top: 50%;
  left: var(--space-3);
  transform: translateY(-50%);
  color: var(--ink-faint);
  pointer-events: none;
}

.place-field .input {
  padding-left: calc(var(--space-3) + 20px + var(--space-2));
  padding-right: calc(var(--space-3) + 20px + var(--space-2));
}

.place-field.valid .input {
  border-color: var(--event-moss);
}

.place-field.invalid .input {
  border-color: var(--danger);
}

.place-state {
  position: absolute;
  top: 50%;
  right: var(--space-3);
  display: grid;
  place-items: center;
  transform: translateY(-50%);
  color: var(--ink-faint);
  pointer-events: none;
}

.ok {
  color: var(--event-moss);
}

.bad {
  color: var(--danger);
}

.suggestions {
  position: absolute;
  z-index: 2;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  padding: var(--space-1);
  box-shadow: var(--shadow-md);
}

.suggestion {
  display: block;
  width: 100%;
  min-height: var(--touch);
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.suggestion:active {
  background: var(--accent-soft);
}

.note {
  margin-top: var(--space-2);
  padding-left: var(--space-2);
  font-size: var(--text-sm);
}
</style>
