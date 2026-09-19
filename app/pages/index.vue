<script setup lang="ts">
import { today } from "~/utils/calendar";

// shallowRef: Temporal objects carry internal slots and must not be wrapped in a reactive proxy.
const month = shallowRef(today().toPlainYearMonth());
</script>

<template>
  <CalendarMonth v-model:month="month" />
</template>
