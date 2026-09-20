<script setup lang="ts">
import { ListChecks, LogOut, Plus, Tags, Users } from "@lucide/vue";
import { today } from "~/utils/calendar";
import { useEventEditor } from "~/composables/useEventEditor";
import { useTodos } from "~/composables/useTodos";

// Today's summary lands here in a later step.
const editor = useEventEditor();
const session = useUserSession();

async function logout() {
  await session.clear();
  await navigateTo("/login");
}
const todos = useTodos();
const membersOpen = ref(false);
const todosOpen = ref(false);
const categoriesOpen = ref(false);
</script>

<template>
  <header class="header">
    <h1 class="brand">cally</h1>
    <nav class="nav" aria-label="Bereiche">
      <NuxtLink to="/" class="nav-link">Kalender</NuxtLink>
      <NuxtLink to="/news" class="nav-link">Nachrichten</NuxtLink>
    </nav>
    <HeaderWeather />
    <div class="actions">
      <button
        class="btn btn-icon"
        aria-label="Kategorien"
        title="Kategorien"
        @click="categoriesOpen = true"
      >
        <Tags :size="22" />
      </button>
      <button class="btn btn-icon" aria-label="Familie" title="Familie" @click="membersOpen = true">
        <Users :size="22" />
      </button>
      <button class="btn btn-icon todos" aria-label="Todos" title="Todos" @click="todosOpen = true">
        <ListChecks :size="22" />
        <span v-if="todos.open.value.length" class="count tabular">{{
          todos.open.value.length
        }}</span>
      </button>
      <button
        class="btn btn-primary btn-icon"
        aria-label="Neuer Termin"
        title="Neuer Termin"
        @click="editor.openNew(today().toString())"
      >
        <Plus :size="24" />
      </button>
      <button
        v-if="session.loggedIn.value"
        class="btn btn-ghost btn-icon logout"
        type="button"
        aria-label="Abmelden"
        title="Abmelden"
        @click="logout"
      >
        <LogOut :size="20" />
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

.nav {
  display: flex;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}

.nav-link {
  display: inline-grid;
  place-items: center;
  min-height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--ink-muted);
  font-weight: 600;
}

.nav-link.router-link-exact-active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.todos {
  position: relative;
}

.logout {
  margin-left: var(--space-2);
}

.count {
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 13px;
  font-weight: 700;
}
</style>
