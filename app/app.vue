<script setup lang="ts">
import { useLookups } from "~/composables/useLookups";
import { useTodos } from "~/composables/useTodos";
import { useToday } from "~/composables/useToday";
import { useLiveSync } from "~/composables/useLiveSync";

// Without a session only the login page renders, so nothing else is loaded
const { loggedIn } = useUserSession();
const authed = computed(() => loggedIn.value || useRuntimeConfig().public.authDisabled === "1");

// Other devices' changes arrive over the live stream
if (authed.value) useLiveSync();

// Members and categories drive event colors everywhere, todos feed the header count
if (authed.value) {
  await Promise.all([
    useLookups("members").load(),
    useLookups("categories").load(),
    useTodos().load(),
    useToday().load(),
  ]);
}
</script>

<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <template v-if="authed">
      <AppHeader />
      <main class="main">
        <NuxtPage />
      </main>
      <EventDialog />
    </template>
    <main v-else class="main">
      <NuxtPage />
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
