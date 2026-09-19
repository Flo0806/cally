<script setup lang="ts">
import { useLookups } from "~/composables/useLookups";

const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ select: [memberId: string] }>();

const members = useLookups("members").items;

function pick(id: string) {
  emit("select", id);
  open.value = false;
}
</script>

<template>
  <AppDialog v-model="open" title="Wer liest?" width="480px">
    <div class="people">
      <button
        v-for="member in members"
        :key="member.id"
        class="person"
        type="button"
        :style="{ '--person': `var(--event-${member.color})` }"
        @click="pick(member.id)"
      >
        <span class="person-dot" />
        {{ member.name }}
      </button>
    </div>
    <p v-if="!members.length" class="text-muted">Noch niemand in der Familie eingetragen.</p>
  </AppDialog>
</template>

<style scoped>
.people {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 72px;
  padding: 0 var(--space-4);
  border: 2px solid var(--line);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--person) 10%, var(--surface));
  color: var(--ink);
  font-size: var(--text-lg);
  font-weight: 700;
  cursor: pointer;
}

.person:active {
  border-color: var(--person);
  background: color-mix(in srgb, var(--person) 22%, var(--surface));
}

.person-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--person);
}
</style>
