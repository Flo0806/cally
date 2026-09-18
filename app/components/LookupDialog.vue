<script setup lang="ts">
import * as v from "valibot";
import { COLORS, type Color, type Lookup } from "#shared/types";
import { lookupInput } from "#shared/schemas";
import { ApiError } from "~/utils/api";
import { useLookups, type LookupKind } from "~/composables/useLookups";

const open = defineModel<boolean>({ required: true });

// quick: no list, only the form; saving emits the new entry and closes
const props = withDefaults(defineProps<{ kind: LookupKind; quick?: boolean }>(), { quick: false });
const emit = defineEmits<{ created: [item: Lookup] }>();

const LABELS: Record<LookupKind, { title: string; description: string; empty: string }> = {
  members: {
    title: "Familie",
    description: "Wer gehört dazu?",
    empty: "Noch niemand eingetragen.",
  },
  categories: {
    title: "Kategorien",
    description: "Wofür ist der Termin?",
    empty: "Noch keine Kategorien.",
  },
};
const labels = computed(() => LABELS[props.kind]);

const { items, load, create, update, remove } = useLookups(props.kind);

const selectedId = ref<string | null>(null);
const form = reactive({ name: "", color: "blue" as Color });
const fieldError = ref("");
const formError = ref("");
const confirmDelete = ref(false);
const busy = ref(false);
const nameInput = useTemplateRef<HTMLInputElement>("nameInput");
// Unique per instance: the submit button in the footer slot targets the form by id
const formId = useId();

const editing = computed(() => selectedId.value !== null);

function reset() {
  selectedId.value = null;
  form.name = "";
  form.color = "blue";
  fieldError.value = "";
  formError.value = "";
  confirmDelete.value = false;
}

function select(item: Lookup) {
  reset();
  selectedId.value = item.id;
  form.name = item.name;
  form.color = item.color;
}

async function focusName() {
  await nextTick();
  nameInput.value?.focus();
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  reset();
  if (!props.quick) {
    try {
      await load();
    } catch (error) {
      formError.value = (error as ApiError).message;
    }
  }
  await focusName();
});

async function save() {
  fieldError.value = "";
  formError.value = "";
  const parsed = v.safeParse(lookupInput, { name: form.name, color: form.color });
  if (!parsed.success) {
    fieldError.value = parsed.issues[0]?.message ?? "Ungültige Eingabe";
    return;
  }

  busy.value = true;
  try {
    if (selectedId.value) {
      await update(selectedId.value, parsed.output);
      reset();
    } else {
      const created = await create(parsed.output);
      if (props.quick) {
        emit("created", created);
        open.value = false;
        return;
      }
      reset();
    }
    await focusName();
  } catch (error) {
    const apiError = error as ApiError;
    fieldError.value = apiError.issues[0]?.message ?? "";
    formError.value = fieldError.value ? "" : apiError.message;
  } finally {
    busy.value = false;
  }
}

async function destroy() {
  if (!selectedId.value) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  busy.value = true;
  try {
    await remove(selectedId.value);
    reset();
  } catch (error) {
    formError.value = (error as ApiError).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AppDialog v-model="open" :title="labels.title" :description="labels.description" width="600px">
    <ul v-if="!quick" class="list">
      <li v-for="item in items" :key="item.id">
        <button
          class="row"
          :class="{ selected: item.id === selectedId }"
          type="button"
          @click="select(item)"
        >
          <span class="dot" :style="{ background: `var(--event-${item.color})` }" />
          <span class="row-name">{{ item.name }}</span>
        </button>
      </li>
      <li v-if="!items.length" class="empty text-muted">{{ labels.empty }}</li>
    </ul>

    <form :id="formId" class="form" @submit.prevent="save">
      <div class="form-head">
        <h3>{{ editing ? "Bearbeiten" : "Neu" }}</h3>
        <button v-if="editing" class="btn btn-ghost" type="button" @click="reset()">
          Abbrechen
        </button>
      </div>

      <div class="field">
        <label class="field-label" :for="`${formId}-name`">Name</label>
        <input
          :id="`${formId}-name`"
          ref="nameInput"
          v-model="form.name"
          class="input"
          autocomplete="off"
          enterkeyhint="done"
        />
        <p v-if="fieldError" class="error">{{ fieldError }}</p>
      </div>

      <div class="field">
        <span class="field-label">Farbe</span>
        <div class="swatches" role="radiogroup" aria-label="Farbe">
          <button
            v-for="color in COLORS"
            :key="color"
            class="swatch"
            :class="{ selected: color === form.color }"
            :style="{ background: `var(--event-${color})` }"
            type="button"
            role="radio"
            :aria-checked="color === form.color"
            :aria-label="color"
            @click="form.color = color"
          />
        </div>
      </div>

      <p v-if="formError" class="error">{{ formError }}</p>
    </form>

    <template #actions>
      <button
        v-if="editing"
        class="btn btn-danger delete"
        type="button"
        :disabled="busy"
        @click="destroy"
      >
        {{ confirmDelete ? "Wirklich löschen?" : "Löschen" }}
      </button>
      <button class="btn btn-primary" type="submit" :form="formId" :disabled="busy">
        {{ editing ? "Speichern" : "Anlegen" }}
      </button>
    </template>
  </AppDialog>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.row:active {
  background: var(--surface-muted);
}

.row.selected {
  background: var(--accent-soft);
}

.dot {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.row-name {
  font-weight: 600;
}

.empty {
  padding: var(--space-3);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--touch);
}

.swatches {
  display: flex;
  gap: var(--space-3);
}

.swatch {
  width: 44px;
  height: 44px;
  border: 3px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 80ms ease;
}

.swatch:active {
  transform: scale(0.94);
}

.swatch.selected {
  border-color: var(--ink);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.delete {
  margin-right: auto;
}
</style>
