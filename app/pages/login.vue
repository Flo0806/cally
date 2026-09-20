<script setup lang="ts">
useHead({ title: "Anmelden" });

const route = useRoute();

const MESSAGES: Record<string, string> = {
  denied: "Dieses Google-Konto ist nicht freigeschaltet.",
  google: "Google hat nicht geantwortet, bitte nochmal versuchen.",
};
const message = computed(() => MESSAGES[String(route.query.error ?? "")] ?? "");
</script>

<template>
  <div class="login">
    <div class="card panel">
      <h1 class="brand">cally</h1>
      <p class="text-muted">Der Familienkalender. Bitte anmelden.</p>
      <a class="btn btn-primary btn-lg" href="/auth/google">Mit Google anmelden</a>
      <p v-if="message" class="error">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  place-items: center;
  height: 100%;
  padding: var(--space-5);
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  width: min(420px, 100%);
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.brand {
  color: var(--accent);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}
</style>
