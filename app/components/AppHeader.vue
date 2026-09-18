<script setup lang="ts">
import { today } from "~/utils/calendar";
import { useEventEditor } from "~/composables/useEventEditor";
import { useTodos } from "~/composables/useTodos";

// Today's summary lands here in a later step.
const editor = useEventEditor();
const todos = useTodos();
const membersOpen = ref(false);
const todosOpen = ref(false);
const categoriesOpen = ref(false);
</script>

<template>
  <header class="header">
    <h1 class="brand">cally</h1>
    <HeaderWeather />
    <div class="actions">
      <button class="btn" @click="categoriesOpen = true">Kategorien</button>
      <button class="btn" @click="membersOpen = true">Familie</button>
      <button class="btn btn-primary" @click="editor.openNew(today().toString())">+ Termin</button>
      <button class="btn" @click="todosOpen = true">
        Todos
        <span v-if="todos.open.value.length" class="count tabular">{{
          todos.open.value.length
        }}</span>
      </button>
    </div>

    <TodoPanel v-model="todosOpen" />

    <LookupDialog v-model="membersOpen" kind="members" />
    <LookupDialog v-model="categoriesOpen" kind="categories" />
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: 80px;
  padding: 0 var(--space-5);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.brand {
  font-size: var(--text-xl);
  color: var(--accent);
}

.actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.count {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-text);
  font-size: var(--text-sm);
  font-weight: 700;
}
</style>
