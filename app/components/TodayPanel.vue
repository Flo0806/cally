<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { TIME_ZONE, toDateTimeString } from "#shared/dates";
import { formatLongDate } from "~/utils/calendar";
import { useToday } from "~/composables/useToday";

const open = defineModel<boolean>({ required: true });

const REFRESH_MS = 15 * 60 * 1000;
const CLOCK_MS = 60 * 1000;

const today = useToday();
const error = ref("");

// "now" as a wall clock string, ticking every minute so departure labels stay right
const now = ref(toDateTimeString(Temporal.Now.plainDateTimeISO(TIME_ZONE)));
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

async function refresh(force = false) {
  error.value = "";
  try {
    await today.load(force);
  } catch (e) {
    error.value = (e as Error).message;
  }
}

watch(open, (isOpen) => {
  clearInterval(refreshTimer);
  clearInterval(clockTimer);
  if (!isOpen) return;
  now.value = toDateTimeString(Temporal.Now.plainDateTimeISO(TIME_ZONE));
  void refresh();
  refreshTimer = setInterval(() => refresh(true), REFRESH_MS);
  clockTimer = setInterval(() => {
    now.value = toDateTimeString(Temporal.Now.plainDateTimeISO(TIME_ZONE));
  }, CLOCK_MS);
});
onUnmounted(() => {
  clearInterval(refreshTimer);
  clearInterval(clockTimer);
});

const title = computed(() => (today.data.value ? formatLongDate(today.data.value.date) : "Heute"));
</script>

<template>
  <AppDialog v-model="open" :title="title" placement="left" width="480px">
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else-if="today.data.value">
      <div v-if="today.data.value.events.length" class="list">
        <TodayEventCard
          v-for="event in today.data.value.events"
          :key="event.key"
          :event="event"
          :now="now"
        />
      </div>
      <p v-else class="empty text-muted">Heute nichts geplant.</p>
    </template>
    <p v-else class="empty text-muted">Lädt ...</p>
  </AppDialog>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.empty {
  padding: var(--space-4) 0;
}

.error {
  color: var(--danger);
}
</style>
