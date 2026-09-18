<script setup lang="ts">
// Today's summary and quick actions land here in later steps.
const membersOpen = ref(false);
</script>

<template>
  <header class="header">
    <h1 class="brand">cally</h1>
    <HeaderWeather />
    <div class="actions">
      <button class="btn" @click="membersOpen = true">Familie</button>
    </div>

    <AppDialog v-model="membersOpen" title="Familie" description="Wer gehört dazu?">
      <p class="text-muted">Mitglieder kommen im nächsten Schritt.</p>
      <template #actions>
        <button class="btn btn-ghost" @click="membersOpen = false">Schließen</button>
        <button class="btn btn-primary" disabled>Speichern</button>
      </template>
    </AppDialog>
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
  margin-left: auto;
}
</style>
