<script setup lang="ts">
import { ListChecks, LogOut, Tags, Users } from "@lucide/vue";

// Below 1280px the header actions live here. A native popover: top layer, light dismiss and
// escape come from the browser, it sits under the menu button at the header's right edge.
const open = defineModel<boolean>({ required: true });
defineProps<{ todoCount: number; loggedIn: boolean }>();
type Action = "todos" | "members" | "categories" | "logout";
const emit = defineEmits<(event: Action) => void>();

const pop = useTemplateRef<HTMLElement>("pop");

watch(open, (isOpen) => {
  const el = pop.value;
  if (!el) return;
  if (isOpen && !el.matches(":popover-open")) el.showPopover();
  if (!isOpen && el.matches(":popover-open")) el.hidePopover();
});

// The element is the source of truth for closing, light dismiss happens without asking us
function onToggle(event: Event) {
  open.value = (event as ToggleEvent).newState === "open";
}

function pick(action: Action) {
  open.value = false;
  emit(action);
}
</script>

<template>
  <div ref="pop" popover="auto" class="menu card" @toggle="onToggle">
    <ul class="menu-list">
      <li>
        <button class="row" type="button" @click="pick('todos')">
          <ListChecks :size="22" />
          <span>Todos</span>
          <span v-if="todoCount" class="count tabular">{{ todoCount }}</span>
        </button>
      </li>
      <li>
        <button class="row" type="button" @click="pick('members')">
          <Users :size="22" />
          <span>Familie</span>
        </button>
      </li>
      <li>
        <button class="row" type="button" @click="pick('categories')">
          <Tags :size="22" />
          <span>Kategorien</span>
        </button>
      </li>
      <li v-if="loggedIn">
        <button class="row row-muted" type="button" @click="pick('logout')">
          <LogOut :size="22" />
          <span>Abmelden</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.menu {
  /* Under the header, flush with the right edge where the button is */
  position: fixed;
  inset: auto;
  top: calc(80px + 6px);
  right: var(--space-4);
  width: 260px;
  margin: 0;
  padding: var(--space-1);
  box-shadow: var(--shadow-md);
}

.menu:popover-open {
  animation: menu-in 140ms ease-out;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}

.menu::backdrop {
  background: transparent;
}

@media (max-width: 639px) {
  .menu {
    top: calc(64px + 6px);
    right: var(--space-3);
  }
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 52px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.row:active {
  background: var(--surface-muted);
}

.row-muted {
  color: var(--ink-muted);
}

.count {
  margin-left: auto;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-text);
  font-size: var(--text-sm);
  font-weight: 700;
}
</style>
