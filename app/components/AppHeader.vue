<script setup lang="ts">
// Weather, today's summary and quick actions land here in later steps.
</script>

<template>
  <header class="header">
    <h1 class="brand">cally</h1>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: 80px;
  padding: 0 var(--space-5);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.brand {
  font-size: var(--text-xl);
  color: var(--accent);
}
</style>
