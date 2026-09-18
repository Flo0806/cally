<script setup lang="ts">
import type { WeatherIconName } from "~/utils/weather";

defineProps<{ name: WeatherIconName }>();
</script>

<template>
  <svg
    class="weather-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"
      />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </template>
    <template v-else-if="name === 'partly'">
      <path d="M8 4v1.5M3.5 8.5H5M5 4.6l1 1" />
      <path d="M6.5 11.5a3.5 3.5 0 1 1 4.9-4.5" />
      <path d="M8 19h9.5a3.5 3.5 0 0 0 .5-6.96A5.5 5.5 0 0 0 7.4 13.1 3 3 0 0 0 8 19Z" />
    </template>
    <template v-else-if="name === 'cloud'">
      <path d="M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 11.3 3.4 3.4 0 0 0 7 18Z" />
    </template>
    <template v-else-if="name === 'fog'">
      <path d="M7 14h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 7.3 3.4 3.4 0 0 0 7 14Z" />
      <path d="M5 18h14M8 21h9" />
    </template>
    <template v-else-if="name === 'drizzle'">
      <path d="M7 14h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 7.3 3.4 3.4 0 0 0 7 14Z" />
      <path d="M9 17v1M13 17v1M17 17v1M11 20v1M15 20v1" />
    </template>
    <template v-else-if="name === 'rain'">
      <path d="M7 14h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 7.3 3.4 3.4 0 0 0 7 14Z" />
      <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" />
    </template>
    <template v-else-if="name === 'snow'">
      <path d="M7 14h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 7.3 3.4 3.4 0 0 0 7 14Z" />
      <path d="M9 17.5h.01M13 20.5h.01M17 17.5h.01M11 20.5h.01M15 17.5h.01" stroke-width="2.5" />
    </template>
    <template v-else-if="name === 'thunder'">
      <path d="M7 14h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.5 7.3 3.4 3.4 0 0 0 7 14Z" />
      <path d="M13 14l-2.5 4h3L11 22" />
    </template>
  </svg>
</template>

<style scoped>
.weather-icon {
  width: 1em;
  height: 1em;
}
</style>
