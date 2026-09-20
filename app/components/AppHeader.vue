<script setup lang="ts">
import {
  CalendarClock,
  CalendarDays,
  ListChecks,
  LogOut,
  Menu,
  Newspaper,
  Plus,
  Tags,
  Users,
} from "@lucide/vue";
import { today } from "~/utils/calendar";
import { useEventEditor } from "~/composables/useEventEditor";
import { useTodos } from "~/composables/useTodos";
import { useToday } from "~/composables/useToday";

// Today's summary lands here in a later step.
const editor = useEventEditor();
const session = useUserSession();
const version = useRuntimeConfig().public.version;

async function logout() {
  await session.clear();
  await navigateTo("/login");
}
const todos = useTodos();
const todayData = useToday().data;
const todayOpen = ref(false);
const todayCount = computed(() => todayData.value?.events.length ?? 0);
const membersOpen = ref(false);
const todosOpen = ref(false);
const menuOpen = ref(false);
const categoriesOpen = ref(false);
</script>

<template>
  <header class="header">
    <div class="brand-block">
      <h1 class="brand">cally</h1>
      <span class="version tabular">v{{ version }}</span>
    </div>
    <button
      type="button"
      class="btn btn-icon today"
      aria-label="Heute"
      title="Heute"
      @click="todayOpen = true"
    >
      <CalendarClock :size="22" />
      <span v-if="todayCount" class="count tabular">{{ todayCount }}</span>
    </button>
    <nav class="nav" aria-label="Bereiche">
      <NuxtLink to="/" class="nav-link" title="Kalender">
        <CalendarDays :size="20" class="nav-icon" />
        <span class="nav-text">Kalender</span>
      </NuxtLink>
      <NuxtLink to="/news" class="nav-link" title="Nachrichten">
        <Newspaper :size="20" class="nav-icon" />
        <span class="nav-text">Nachrichten</span>
      </NuxtLink>
    </nav>
    <HeaderWeather />
    <div class="actions">
      <button
        type="button"
        class="btn btn-icon wide-only"
        aria-label="Kategorien"
        title="Kategorien"
        @click="categoriesOpen = true"
      >
        <Tags :size="22" />
      </button>
      <button
        type="button"
        class="btn btn-icon wide-only"
        aria-label="Familie"
        title="Familie"
        @click="membersOpen = true"
      >
        <Users :size="22" />
      </button>
      <button
        type="button"
        class="btn btn-icon wide-only todos"
        aria-label="Todos"
        title="Todos"
        @click="todosOpen = true"
      >
        <ListChecks :size="22" />
        <span v-if="todos.open.value.length" class="count tabular">{{
          todos.open.value.length
        }}</span>
      </button>
      <button
        type="button"
        class="btn btn-primary btn-icon"
        aria-label="Neuer Termin"
        title="Neuer Termin"
        @click="editor.openNew(today().toString())"
      >
        <Plus :size="24" />
      </button>
      <button
        v-if="session.loggedIn.value"
        class="btn btn-ghost btn-icon logout wide-only"
        type="button"
        aria-label="Abmelden"
        title="Abmelden"
        @click="logout"
      >
        <LogOut :size="20" />
      </button>
      <button
        type="button"
        class="btn btn-icon narrow-only"
        aria-label="Menü"
        title="Menü"
        @click="menuOpen = true"
      >
        <Menu :size="22" />
        <span v-if="todos.open.value.length" class="count tabular">{{
          todos.open.value.length
        }}</span>
      </button>
    </div>

    <HeaderMenu
      v-model="menuOpen"
      :todo-count="todos.open.value.length"
      :logged-in="session.loggedIn.value"
      @todos="todosOpen = true"
      @members="membersOpen = true"
      @categories="categoriesOpen = true"
      @logout="logout"
    />

    <TodoPanel v-model="todosOpen" />
    <TodayPanel v-model="todayOpen" />

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

.brand-block {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.brand {
  font-size: var(--text-xl);
  color: var(--accent);
}

.version {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-faint);
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

.todos,
.today {
  position: relative;
}

.logout {
  margin-left: var(--space-2);
}

.nav-icon {
  display: none;
}

.narrow-only {
  display: none;
  position: relative;
}

/* Below the tablet width the secondary actions move into the menu */
@media (max-width: 1279px) {
  .header {
    gap: var(--space-3);
    padding: 0 var(--space-4);
  }

  .wide-only {
    display: none;
  }

  .narrow-only {
    display: inline-flex;
  }
}

/* Phone: icons only, the brand shrinks to its initial */
@media (max-width: 639px) {
  .header {
    height: 64px;
    gap: var(--space-2);
    padding: 0 var(--space-3);
  }

  .brand {
    width: 1ch;
    overflow: hidden;
    white-space: nowrap;
  }

  .version {
    display: none;
  }

  .nav-text {
    display: none;
  }

  .nav-icon {
    display: block;
  }

  .nav-link {
    padding: 0 var(--space-3);
  }
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
