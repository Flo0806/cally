<script setup lang="ts">
import { Check, Copy } from "@lucide/vue";
import * as v from "valibot";
import type { AgentKey } from "#shared/types";
import { agentKeyInput } from "#shared/schemas";
import type { ApiError } from "~/utils/api";
import { formatRelative } from "~/utils/calendar";
import { useAgentKeys } from "~/composables/useAgentKeys";

useHead({ title: "Einstellungen" });

const { keys, create, revoke } = useAgentKeys();

const name = ref("");
const error = ref("");
const busy = ref(false);

const newKey = ref("");
const showKey = ref(false);
const copied = ref(false);

async function submit() {
  error.value = "";
  const parsed = v.safeParse(agentKeyInput, { name: name.value });
  if (!parsed.success) {
    error.value = parsed.issues[0]?.message ?? "Ungültige Eingabe";
    return;
  }
  busy.value = true;
  try {
    newKey.value = await create(parsed.output.name);
    name.value = "";
    copied.value = false;
    showKey.value = true;
  } catch (e) {
    error.value = (e as ApiError).message;
  } finally {
    busy.value = false;
  }
}

// The key must not linger in memory once the dialog is gone
watch(showKey, (open) => {
  if (!open) newKey.value = "";
});

async function copy() {
  await navigator.clipboard.writeText(newKey.value);
  copied.value = true;
}

// Second tap confirms, like deleting a member
const armed = ref<string | null>(null);

async function onRevoke(id: string) {
  if (armed.value !== id) {
    armed.value = id;
    return;
  }
  armed.value = null;
  try {
    await revoke(id);
  } catch (e) {
    error.value = (e as ApiError).message;
  }
}

function usage(key: AgentKey): string {
  return key.lastUsedAt ? `benutzt ${formatRelative(key.lastUsedAt)}` : "nie benutzt";
}
</script>

<template>
  <div class="settings">
    <section class="card section">
      <h2>Agent-Keys</h2>
      <p class="text-muted">
        Mit einem Key kann ein persönlicher Agent Termine lesen und anlegen. Der Key wird nur einmal
        angezeigt.
      </p>

      <form class="create" @submit.prevent="submit">
        <input
          v-model="name"
          class="input"
          aria-label="Name"
          placeholder="Name, z.B. Flos Agent"
          autocomplete="off"
          enterkeyhint="done"
        />
        <button class="btn btn-primary" type="submit" :disabled="busy">Erstellen</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>

      <ul class="list">
        <li v-for="key in keys" :key="key.id" class="row" :class="{ revoked: key.revokedAt }">
          <div class="row-main">
            <span class="row-name">{{ key.name }}</span>
            <span class="text-muted text-sm">
              <code>{{ key.prefix }}…</code> · erstellt {{ formatRelative(key.createdAt) }} ·
              {{ usage(key) }}
            </span>
          </div>
          <span v-if="key.revokedAt" class="text-muted text-sm">Widerrufen</span>
          <button v-else class="btn btn-danger" type="button" @click="onRevoke(key.id)">
            {{ armed === key.id ? "Wirklich widerrufen?" : "Widerrufen" }}
          </button>
        </li>
        <li v-if="!keys.length" class="empty text-muted">Noch keine Keys</li>
      </ul>
    </section>

    <AppDialog
      v-model="showKey"
      title="Neuer Key"
      description="Nur jetzt sichtbar. Kopieren und im Agenten hinterlegen."
    >
      <code class="key">{{ newKey }}</code>
      <template #actions>
        <button class="btn btn-primary" type="button" @click="copy">
          <component :is="copied ? Check : Copy" :size="20" />
          {{ copied ? "Kopiert" : "Kopieren" }}
        </button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.settings {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5) var(--space-6);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-5);
}

.create {
  display: flex;
  gap: var(--space-2);
}

.create .input {
  flex: 1;
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.list {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.row.revoked .row-name {
  color: var(--ink-faint);
  text-decoration: line-through;
}

.row-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.row-name {
  font-weight: 600;
}

.empty {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

.key {
  display: block;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  font-size: var(--text-md);
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
