<script setup lang="ts">
import { useLookups } from "~/composables/useLookups";
import { useTodos } from "~/composables/useTodos";

// Members and categories drive event colors everywhere, todos feed the header count
await Promise.all([
  useLookups("members").load(),
  useLookups("categories").load(),
  useTodos().load(),
]);
</script>

<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main class="main">
      <NuxtPage />
    </main>
    <EventDialog />
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
