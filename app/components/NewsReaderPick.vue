<script setup lang="ts">
import { useLookups } from "~/composables/useLookups";

// The person tiles, used full page when nobody is chosen and in a dialog to switch
defineProps<{ current?: string | null }>();
const emit = defineEmits<{ select: [memberId: string] }>();

const members = useLookups("members").items;
</script>

<template>
  <div class="people">
    <button
      v-for="member in members"
      :key="member.id"
      class="person"
      :class="{ on: member.id === current }"
      type="button"
      :style="{ '--person': `var(--event-${member.color})` }"
      @click="emit('select', member.id)"
    >
      <span class="person-dot" />
      {{ member.name }}
    </button>
    <p v-if="!members.length" class="text-muted">
      Noch niemand in der Familie eingetragen. Lege zuerst Mitglieder an.
    </p>
  </div>
</template>

<style scoped>
.people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 80px;
  padding: 0 var(--space-4);
  border: 2px solid var(--line);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--person) 10%, var(--surface));
  color: var(--ink);
  font-size: var(--text-lg);
  font-weight: 700;
  cursor: pointer;
}

.person:active,
.person.on {
  border-color: var(--person);
  background: color-mix(in srgb, var(--person) 22%, var(--surface));
}

.person-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--person);
}
</style>
