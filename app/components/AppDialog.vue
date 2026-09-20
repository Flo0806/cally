<script setup lang="ts">
import { X } from "@lucide/vue";

// Native <dialog>: showModal() brings focus trap, escape key, top layer and inert background.
// What is left is syncing open state with v-model and the backdrop click.
const open = defineModel<boolean>({ required: true });

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    width?: string;
    placement?: "center" | "right" | "left";
  }>(),
  { width: "520px", placement: "center" },
);

const dialog = useTemplateRef<HTMLDialogElement>("dialog");

watch(open, (isOpen) => {
  if (isOpen) dialog.value?.showModal();
  else if (dialog.value?.open) dialog.value.close();
});

onMounted(() => {
  if (open.value) dialog.value?.showModal();
});

// The element is the source of truth for closing, escape closes it without asking first
function syncClosed() {
  open.value = false;
}

// closedby="any" handles light dismiss natively. The fallback below is only for browsers without
// it and has to distinguish a real backdrop click from a text selection that ends on the backdrop.
const nativeLightDismiss = import.meta.client && "closedBy" in HTMLDialogElement.prototype;

let pressedOnBackdrop = false;
function onPress(event: MouseEvent) {
  if (nativeLightDismiss) return;
  pressedOnBackdrop = event.target === dialog.value;
}
function onBackdrop(event: MouseEvent) {
  if (nativeLightDismiss) return;
  if (pressedOnBackdrop && event.target === dialog.value) open.value = false;
  pressedOnBackdrop = false;
}
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    :class="placement"
    :style="{ '--dialog-width': width }"
    closedby="any"
    @close="syncClosed"
    @mousedown="onPress"
    @click="onBackdrop"
  >
    <div class="panel">
      <header class="head">
        <div class="head-text">
          <h2 class="title">{{ title }}</h2>
          <p v-if="description" class="description">{{ description }}</p>
        </div>
        <button class="btn btn-ghost btn-icon" aria-label="Schließen" @click="open = false">
          <X :size="22" />
        </button>
      </header>

      <div class="body">
        <slot />
      </div>

      <footer v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(var(--dialog-width), calc(100vw - 2 * var(--space-4)));
  max-height: calc(100dvh - 2 * var(--space-5));
  padding: 0;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.dialog::backdrop {
  background: rgb(22 38 43 / 0.45);
}

.dialog[open] {
  animation: dialog-in 160ms ease-out;
}

.dialog[open]::backdrop {
  animation: backdrop-in 160ms ease-out;
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }
}

/* Drawers: full height on one edge, slide in from there */
.dialog.right,
.dialog.left {
  height: 100dvh;
  max-height: 100dvh;
  border-radius: 0;
}

.dialog.right {
  margin: 0 0 0 auto;
}

.dialog.left {
  margin: 0 auto 0 0;
}

.dialog.right[open] {
  animation: drawer-in-right 200ms ease-out;
}

.dialog.left[open] {
  animation: drawer-in-left 200ms ease-out;
}

@keyframes drawer-in-right {
  from {
    transform: translateX(40px);
    opacity: 0;
  }
}

@keyframes drawer-in-left {
  from {
    transform: translateX(-40px);
    opacity: 0;
  }
}

.dialog.right .panel,
.dialog.left .panel {
  height: 100dvh;
  max-height: 100dvh;
}

.dialog.right .body,
.dialog.left .body {
  flex: 1;
}

@media (max-width: 479px) {
  .dialog.right,
  .dialog.left {
    width: 100vw;
    max-width: 100vw;
  }
}

.panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 2 * var(--space-5));
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-4) var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--line);
}

.head-text {
  padding-top: 6px;
}

.title {
  font-size: var(--text-lg);
}

.description {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--ink-muted);
}

.body {
  padding: var(--space-5);
  overflow-y: auto;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--line);
  background: var(--surface-muted);
}
</style>
