<script setup lang="ts">
// Today's summary and quick actions land here in later steps.
const membersOpen = ref(false);
const categoriesOpen = ref(false);
</script>

<template>
  <header class="header">
    <h1 class="brand">cally</h1>
    <HeaderWeather />
    <div class="actions">
      <button class="btn" @click="categoriesOpen = true">Kategorien</button>
      <button class="btn" @click="membersOpen = true">Familie</button>
    </div>

    <LookupDialog v-model="membersOpen" kind="members" />
    <LookupDialog v-model="categoriesOpen" kind="categories" />
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

.actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}
</style>
