<script setup lang="ts">
import { today } from "~/utils/calendar";

// shallowRef: Temporal objects carry internal slots and must not be wrapped in a reactive proxy.
const month = shallowRef(today().toPlainYearMonth());
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
