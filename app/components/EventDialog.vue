<script setup lang="ts">
import { Loader2 } from "@lucide/vue";
import * as v from "valibot";
import { Temporal } from "temporal-polyfill";
import { eventInput } from "#shared/schemas";
import { dateOf } from "#shared/dates";
import { REPEAT_OPTIONS, buildRrule, parseRrule, type Repeat } from "#shared/rrule";
import type { Place } from "#shared/types";
import type { PlaceStatus } from "~/components/PlaceInput.vue";
import { ApiError } from "~/utils/api";
import { useEventEditor } from "~/composables/useEventEditor";
import { useEvents } from "~/composables/useEvents";
import { useLookups } from "~/composables/useLookups";

const { state, close } = useEventEditor();
const events = useEvents();
const members = useLookups("members").items;
const categories = useLookups("categories").items;

const REPEAT_LABELS: Record<Repeat | "custom", string> = {
  none: "Nie",
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  yearly: "Jährlich",
  custom: "Eigene Regel",
};

const open = computed({
  get: () => state.value.open,
  set: (value) => {
    if (!value) close();
  },
});
const editing = computed(() => state.value.eventId !== null);
const formId = useId();
const titleInput = useTemplateRef<HTMLInputElement>("titleInput");

const form = reactive({
  title: "",
  notes: "",
  allDay: false,
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "10:00",
  repeat: "none" as Repeat | "custom",
  until: "",
  categoryId: null as string | null,
  memberIds: [] as string[],
  location: "",
  place: null as Place | null,
  placeStatus: "empty" as PlaceStatus,
});
const placeInput = useTemplateRef<{ check: () => Promise<boolean> }>("placeInput");
// Preserved from a loaded event: a rule the form cannot express, and the removed occurrences
let customRrule: string | null = null;
let exdates: string[] = [];
let isSeries = false;

const errors = reactive<Record<string, string>>({});
const formError = ref("");
const busy = ref(false);
const loading = ref(false);
const confirmDelete = ref(false);

// The follow-along watchers below must only react to typing, not to programmatic fills
let filling = false;
async function fill(values: Partial<typeof form>) {
  filling = true;
  Object.assign(form, values);
  await nextTick();
  filling = false;
}

function reset(date: string) {
  void fill({
    title: "",
    notes: "",
    allDay: false,
    startDate: date,
    endDate: date,
    startTime: "09:00",
    endTime: "10:00",
    repeat: "none",
    until: "",
    categoryId: null,
    memberIds: [],
    location: "",
    place: null,
    placeStatus: "empty",
  });
  customRrule = null;
  exdates = [];
  isSeries = false;
  for (const key of Object.keys(errors)) delete errors[key];
  formError.value = "";
  confirmDelete.value = false;
}

async function loadEvent(id: string) {
  loading.value = true;
  try {
    const event = await events.load(id);
    const rule = parseRrule(event.rrule);
    await fill({
      title: event.title,
      notes: event.notes,
      allDay: event.allDay,
      startDate: dateOf(event.start),
      endDate: dateOf(event.end),
      startTime: event.allDay ? "09:00" : event.start.slice(11),
      endTime: event.allDay ? "10:00" : event.end.slice(11),
      repeat: rule.repeat,
      until: rule.until ?? "",
      categoryId: event.categoryId,
      memberIds: [...event.memberIds],
      location: event.location,
      place:
        event.locationLat !== null && event.locationLon !== null
          ? { label: event.location, lat: event.locationLat, lon: event.locationLon }
          : null,
      placeStatus: event.locationLat !== null ? "valid" : event.location ? "unchecked" : "empty",
    });
    customRrule = rule.repeat === "custom" ? event.rrule : null;
    exdates = event.exdates;
    isSeries = event.rrule !== null;
  } catch (error) {
    formError.value = (error as ApiError).message;
  } finally {
    loading.value = false;
  }
}

watch(
  () => state.value.open,
  async (isOpen) => {
    if (!isOpen) return;
    reset(state.value.date);
    if (state.value.eventId) await loadEvent(state.value.eventId);
    await nextTick();
    titleInput.value?.focus();
  },
);

// End follows start: keep the day span and the duration when the start moves
watch(
  () => form.startDate,
  (next, prev) => {
    if (filling || !prev || !next || !form.endDate) return;
    const span = Temporal.PlainDate.from(form.endDate).since(Temporal.PlainDate.from(prev));
    form.endDate = Temporal.PlainDate.from(next).add(span).toString();
  },
);
watch(
  () => form.startTime,
  (next, prev) => {
    if (filling || !prev || !next || !form.endTime) return;
    const duration = Temporal.PlainTime.from(form.endTime).since(Temporal.PlainTime.from(prev));
    form.endTime = Temporal.PlainTime.from(next).add(duration).toString({ smallestUnit: "minute" });
  },
);

function toggleMember(id: string) {
  form.memberIds = form.memberIds.includes(id)
    ? form.memberIds.filter((m) => m !== id)
    : [...form.memberIds, id];
}

function toInput() {
  const rrule =
    form.repeat === "custom"
      ? customRrule
      : buildRrule(form.repeat, form.startDate, form.until || null);
  return {
    title: form.title,
    notes: form.notes,
    allDay: form.allDay,
    start: form.allDay ? form.startDate : `${form.startDate}T${form.startTime}`,
    end: form.allDay ? form.endDate : `${form.endDate}T${form.endTime}`,
    rrule,
    exdates,
    categoryId: form.categoryId,
    memberIds: form.memberIds,
    location: form.location,
    locationLat: form.place?.lat ?? null,
    locationLon: form.place?.lon ?? null,
  };
}

function showIssues(issues: { path: string; message: string }[]) {
  for (const issue of issues) errors[issue.path || "form"] = issue.message;
}

async function save() {
  for (const key of Object.keys(errors)) delete errors[key];
  formError.value = "";

  // The place must resolve before anything else is validated, a wrong place is worse than an error.
  // The field shows its own red mark, no second message needed.
  if (!(await placeInput.value?.check())) return;

  const parsed = v.safeParse(eventInput, toInput());
  if (!parsed.success) {
    showIssues(
      parsed.issues.map((issue) => ({
        path: issue.path?.map((p) => String(p.key)).join(".") ?? "",
        message: issue.message,
      })),
    );
    return;
  }

  busy.value = true;
  try {
    await events.save(parsed.output, state.value.eventId ?? undefined);
    close();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.issues.length) showIssues(apiError.issues);
    else formError.value = apiError.message;
  } finally {
    busy.value = false;
  }
}

async function destroy(scope: "one" | "all") {
  if (!state.value.eventId) return;
  busy.value = true;
  try {
    if (scope === "one" && state.value.occurrenceStart) {
      await events.removeOccurrence(state.value.eventId, state.value.occurrenceStart);
    } else {
      await events.remove(state.value.eventId);
    }
    close();
  } catch (error) {
    formError.value = (error as ApiError).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AppDialog v-model="open" :title="editing ? 'Termin bearbeiten' : 'Neuer Termin'" width="680px">
    <p v-if="loading" class="text-muted">Lädt ...</p>

    <form v-else :id="formId" class="form" @submit.prevent="save">
      <div class="field">
        <label class="field-label" :for="`${formId}-title`">Titel</label>
        <input
          :id="`${formId}-title`"
          ref="titleInput"
          v-model="form.title"
          class="input input-lg"
          autocomplete="off"
          enterkeyhint="done"
        />
        <p v-if="errors.title" class="error">{{ errors.title }}</p>
      </div>

      <label class="switch">
        <span>Ganztägig</span>
        <input v-model="form.allDay" type="checkbox" />
      </label>

      <div class="field-row">
        <div class="field">
          <label class="field-label" :for="`${formId}-start`">Beginn</label>
          <div class="field-row">
            <DateField :id="`${formId}-start`" v-model="form.startDate" label="Beginn" />
            <TimeField v-if="!form.allDay" v-model="form.startTime" label="Uhrzeit Beginn" />
          </div>
          <p v-if="errors.start" class="error">{{ errors.start }}</p>
        </div>
        <div class="field">
          <label class="field-label" :for="`${formId}-end`">Ende</label>
          <div class="field-row">
            <DateField :id="`${formId}-end`" v-model="form.endDate" label="Ende" />
            <TimeField v-if="!form.allDay" v-model="form.endTime" label="Uhrzeit Ende" />
          </div>
          <p v-if="errors.end" class="error">{{ errors.end }}</p>
        </div>
      </div>

      <div class="field">
        <label class="field-label" :for="`${formId}-location`">Ort</label>
        <PlaceInput
          :id="`${formId}-location`"
          ref="placeInput"
          v-model="form.location"
          v-model:place="form.place"
          v-model:status="form.placeStatus"
        />
        <p v-if="errors.location" class="error">{{ errors.location }}</p>
      </div>

      <div class="field">
        <span class="field-label">Wiederholen</span>
        <div class="choices" role="radiogroup" aria-label="Wiederholen">
          <button
            v-for="option in REPEAT_OPTIONS"
            :key="option"
            class="choice"
            type="button"
            role="radio"
            :aria-pressed="form.repeat === option"
            :aria-checked="form.repeat === option"
            @click="form.repeat = option"
          >
            {{ REPEAT_LABELS[option] }}
          </button>
          <button
            v-if="form.repeat === 'custom'"
            class="choice"
            type="button"
            role="radio"
            aria-pressed="true"
            aria-checked="true"
          >
            {{ REPEAT_LABELS.custom }}
          </button>
        </div>
        <p v-if="errors.rrule" class="error">{{ errors.rrule }}</p>
      </div>

      <div v-if="form.repeat !== 'none' && form.repeat !== 'custom'" class="field until">
        <label class="field-label" :for="`${formId}-until`">Endet am</label>
        <div class="field-row">
          <DateField
            :id="`${formId}-until`"
            v-model="form.until"
            label="Endet am"
            placeholder="Nie"
          />
          <button v-if="form.until" class="btn btn-ghost" type="button" @click="form.until = ''">
            Nie
          </button>
        </div>
      </div>

      <div v-if="categories.length" class="field">
        <span class="field-label">Kategorie</span>
        <div class="choices">
          <button
            class="choice"
            type="button"
            :aria-pressed="form.categoryId === null"
            @click="form.categoryId = null"
          >
            Keine
          </button>
          <button
            v-for="category in categories"
            :key="category.id"
            class="choice"
            type="button"
            :aria-pressed="form.categoryId === category.id"
            @click="form.categoryId = category.id"
          >
            <span class="choice-dot" :style="{ background: `var(--event-${category.color})` }" />
            {{ category.name }}
          </button>
        </div>
      </div>

      <div v-if="members.length" class="field">
        <span class="field-label">Wer</span>
        <div class="choices">
          <button
            v-for="member in members"
            :key="member.id"
            class="choice"
            type="button"
            :aria-pressed="form.memberIds.includes(member.id)"
            @click="toggleMember(member.id)"
          >
            <span class="choice-dot" :style="{ background: `var(--event-${member.color})` }" />
            {{ member.name }}
          </button>
        </div>
        <p class="hint text-muted">Niemand ausgewählt heißt: alle.</p>
      </div>

      <div class="field">
        <label class="field-label" :for="`${formId}-notes`">Notizen</label>
        <textarea :id="`${formId}-notes`" v-model="form.notes" class="textarea" />
      </div>

      <p v-if="formError || errors.form" class="error">{{ formError || errors.form }}</p>
    </form>

    <template #actions>
      <div v-if="editing && !loading" class="delete-group">
        <button
          v-if="!confirmDelete"
          class="btn btn-danger"
          type="button"
          :disabled="busy"
          @click="confirmDelete = true"
        >
          Löschen
        </button>
        <template v-else-if="isSeries">
          <button class="btn btn-danger" type="button" :disabled="busy" @click="destroy('one')">
            Nur dieser Termin
          </button>
          <button class="btn btn-danger" type="button" :disabled="busy" @click="destroy('all')">
            Ganze Serie
          </button>
        </template>
        <button
          v-else
          class="btn btn-danger"
          type="button"
          :disabled="busy"
          @click="destroy('all')"
        >
          Wirklich löschen?
        </button>
      </div>
      <button class="btn btn-ghost" type="button" :disabled="busy" @click="close()">
        Abbrechen
      </button>
      <button
        class="btn btn-primary"
        type="submit"
        :form="formId"
        :disabled="busy || loading || form.placeStatus === 'checking'"
      >
        <Loader2 v-if="busy || form.placeStatus === 'checking'" :size="20" class="spin" />
        {{ editing ? "Speichern" : "Anlegen" }}
      </button>
    </template>
  </AppDialog>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.input-lg {
  min-height: 56px;
  font-size: var(--text-lg);
}

/* Date and time share one row, so neither may claim the full width */
.field-row > .input {
  flex: 1;
  width: auto;
  min-width: 0;
}

.time {
  flex: 0 0 132px;
}

.until {
  max-width: 320px;
}

.hint {
  font-size: var(--text-sm);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.delete-group {
  display: flex;
  gap: var(--space-2);
  margin-right: auto;
}
</style>
