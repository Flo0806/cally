<script setup lang="ts">
import { today } from "~/utils/calendar";
import { useLookups } from "~/composables/useLookups";

// shallowRef: Temporal objects carry internal slots and must not be wrapped in a reactive proxy.
const month = shallowRef(today().toPlainYearMonth());

// Members and categories drive event colors everywhere, so load them once before the first render
await Promise.all([useLookups("members").load(), useLookups("categories").load()]);
</script>

<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main class="main">
      <CalendarMonth v-model:month="month" />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.main {
  flex: 1;
  min-height: 0;
}
</style>
