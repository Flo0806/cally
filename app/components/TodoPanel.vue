<script setup lang="ts">
import * as v from "valibot";
import { Check, Pencil, Plus, X } from "@lucide/vue";
import type { Todo } from "#shared/types";
import { todoInput } from "#shared/schemas";
import { ApiError } from "~/utils/api";
import { useTodos } from "~/composables/useTodos";
import { useLookups } from "~/composables/useLookups";

const open = defineModel<boolean>({ required: true });

const todos = useTodos();
const members = useLookups("members").items;

const title = ref("");
const memberId = ref<string | null>(null);
const error = ref("");
const busy = ref(false);
const showDone = ref(false);
const input = useTemplateRef<HTMLInputElement>("input");
const formId = useId();

watch(open, async (isOpen) => {
  if (!isOpen) return;
  error.value = "";
  await nextTick();
  input.value?.focus();
});

function memberOf(todo: Todo) {
  return todo.memberId ? members.value.find((m) => m.id === todo.memberId) : undefined;
}

async function add() {
  error.value = "";
  const parsed = v.safeParse(todoInput, { title: title.value, memberId: memberId.value });
  if (!parsed.success) {
    error.value = parsed.issues[0]?.message ?? "Ungültige Eingabe";
    return;
  }
  busy.value = true;
  try {
    await todos.add(parsed.output);
    title.value = "";
    input.value?.focus();
  } catch (e) {
    error.value = (e as ApiError).message;
  } finally {
    busy.value = false;
  }
}

async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = (e as ApiError).message;
  }
}

// Inline edit of one row: title and member
const editingId = ref<string | null>(null);
const edit = reactive({ title: "", memberId: null as string | null });
const editInput = useTemplateRef<HTMLInputElement>("editInput");

async function startEdit(todo: Todo) {
  confirmId.value = null;
  editingId.value = todo.id;
  edit.title = todo.title;
  edit.memberId = todo.memberId;
  await nextTick();
  editInput.value?.focus();
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit() {
  if (!editingId.value) return;
  const parsed = v.safeParse(todoInput, { title: edit.title, memberId: edit.memberId });
  if (!parsed.success) {
    error.value = parsed.issues[0]?.message ?? "Ungültige Eingabe";
    return;
  }
  const id = editingId.value;
  await run(() => todos.update(id, parsed.output));
  editingId.value = null;
}

// Delete asks once: the X turns into "Wirklich löschen?" until tapped again or another row is touched
const confirmId = ref<string | null>(null);

function askRemove(todo: Todo) {
  editingId.value = null;
  confirmId.value = todo.id;
}

async function confirmRemove(id: string) {
  await run(() => todos.remove(id));
  confirmId.value = null;
}
</script>

<template>
  <AppDialog v-model="open" title="Zu erledigen" placement="right" width="440px">
    <form :id="formId" class="add" @submit.prevent="add">
      <div class="add-row">
        <input
          ref="input"
          v-model="title"
          class="input"
          placeholder="Was ist zu tun?"
          autocomplete="off"
          enterkeyhint="done"
        />
        <button
          class="btn btn-primary btn-icon"
          type="submit"
          :disabled="busy"
          aria-label="Hinzufügen"
        >
          <Plus :size="24" />
        </button>
      </div>
      <div v-if="members.length" class="choices">
        <button
          class="choice choice-sm"
          type="button"
          :aria-pressed="memberId === null"
          @click="memberId = null"
        >
          Alle
        </button>
        <button
          v-for="member in members"
          :key="member.id"
          class="choice choice-sm"
          type="button"
          :aria-pressed="memberId === member.id"
          @click="memberId = member.id"
        >
          <span class="choice-dot" :style="{ background: `var(--event-${member.color})` }" />
          {{ member.name }}
        </button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <ul v-if="todos.open.value.length" class="list">
      <li v-for="todo in todos.open.value" :key="todo.id" class="todo">
        <template v-if="editingId === todo.id">
          <form class="edit" @submit.prevent="saveEdit">
            <div class="add-row">
              <input
                ref="editInput"
                v-model="edit.title"
                class="input"
                autocomplete="off"
                enterkeyhint="done"
              />
              <button class="btn btn-primary btn-icon" type="submit" aria-label="Speichern">
                <Check :size="22" />
              </button>
              <button
                class="btn btn-ghost btn-icon"
                type="button"
                aria-label="Abbrechen"
                @click="cancelEdit"
              >
                <X :size="22" />
              </button>
            </div>
            <div v-if="members.length" class="choices">
              <button
                class="choice choice-sm"
                type="button"
                :aria-pressed="edit.memberId === null"
                @click="edit.memberId = null"
              >
                Alle
              </button>
              <button
                v-for="member in members"
                :key="member.id"
                class="choice choice-sm"
                type="button"
                :aria-pressed="edit.memberId === member.id"
                @click="edit.memberId = member.id"
              >
                <span class="choice-dot" :style="{ background: `var(--event-${member.color})` }" />
                {{ member.name }}
              </button>
            </div>
          </form>
        </template>

        <template v-else>
          <label class="checkbox todo-check">
            <input type="checkbox" :checked="todo.done" @change="run(() => todos.toggle(todo))" />
            <span class="todo-title">{{ todo.title }}</span>
          </label>
          <span
            v-if="memberOf(todo)"
            class="todo-member"
            :style="{ background: `var(--event-${memberOf(todo)!.color})` }"
          >
            {{ memberOf(todo)!.name }}
          </span>
          <button
            v-if="confirmId === todo.id"
            class="btn btn-danger confirm"
            type="button"
            @click="confirmRemove(todo.id)"
          >
            Wirklich löschen?
          </button>
          <template v-else>
            <button
              class="btn btn-ghost btn-icon todo-action"
              type="button"
              aria-label="Bearbeiten"
              @click="startEdit(todo)"
            >
              <Pencil :size="20" />
            </button>
            <button
              class="btn btn-ghost btn-icon todo-action"
              type="button"
              aria-label="Löschen"
              @click="askRemove(todo)"
            >
              <X :size="20" />
            </button>
          </template>
        </template>
      </li>
    </ul>
    <p v-else class="empty text-muted">Alles erledigt.</p>

    <section v-if="todos.done.value.length" class="done">
      <button class="done-toggle" type="button" @click="showDone = !showDone">
        <span>Erledigt ({{ todos.done.value.length }})</span>
        <span class="done-chevron" :class="{ up: showDone }">›</span>
      </button>
      <template v-if="showDone">
        <ul class="list">
          <li v-for="todo in todos.done.value" :key="todo.id" class="todo is-done">
            <label class="checkbox todo-check">
              <input type="checkbox" :checked="todo.done" @change="run(() => todos.toggle(todo))" />
              <span class="todo-title">{{ todo.title }}</span>
            </label>
          </li>
        </ul>
        <button class="btn btn-ghost clear" type="button" @click="run(() => todos.clearDone())">
          Erledigte löschen
        </button>
      </template>
    </section>
  </AppDialog>
</template>

<style scoped>
.add {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.add-row {
  display: flex;
  gap: var(--space-2);
}

.add-row .input {
  flex: 1;
  width: auto;
  min-width: 0;
}

.choice-sm {
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.list {
  display: flex;
  flex-direction: column;
}

.todo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 56px;
  border-bottom: 1px solid var(--line);
}

.todo-check {
  flex: 1;
  min-width: 0;
  gap: var(--space-3);
}

.todo-title {
  font-size: var(--text-md);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.is-done .todo-title {
  color: var(--ink-faint);
  text-decoration: line-through;
}

.todo-member {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 600;
}

.todo-action {
  flex: none;
  color: var(--ink-faint);
}

.confirm {
  flex: none;
  min-height: 40px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) 0;
}

.empty {
  padding: var(--space-4) 0;
}

.done {
  margin-top: var(--space-5);
}

.done-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: var(--touch);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-weight: 600;
  cursor: pointer;
}

.done-chevron {
  display: inline-block;
  font-size: var(--text-xl);
  transform: rotate(90deg);
  transition: transform 160ms ease;
}

.done-chevron.up {
  transform: rotate(-90deg);
}

.clear {
  margin-top: var(--space-3);
}
</style>
