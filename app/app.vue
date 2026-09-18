<script setup lang="ts">
// Temporary style sheet page. Replaced by the real app once the base styles are approved.
const allDay = ref(true);
const checked = ref(false);
const view = ref<"month" | "week">("month");
</script>

<template>
  <main class="showcase">
    <h1>cally</h1>
    <p class="text-muted">Basis-Styles: Buttons, Eingabefelder, Schalter.</p>

    <section>
      <h2>Buttons</h2>
      <div class="row">
        <button class="btn btn-primary">Speichern</button>
        <button class="btn">Abbrechen</button>
        <button class="btn btn-ghost">Heute</button>
        <button class="btn btn-danger">Löschen</button>
        <button class="btn btn-icon" aria-label="Vorheriger Monat">‹</button>
        <button class="btn btn-icon" aria-label="Nächster Monat">›</button>
        <button class="btn btn-primary btn-lg">+ Termin</button>
        <button class="btn" disabled>Deaktiviert</button>
      </div>
      <div class="segmented">
        <button :aria-pressed="view === 'month'" @click="view = 'month'">Monat</button>
        <button :aria-pressed="view === 'week'" @click="view = 'week'">Woche</button>
      </div>
    </section>

    <section class="card form">
      <h2>Formular</h2>
      <div class="field">
        <label class="field-label" for="title">Titel</label>
        <input id="title" class="input" placeholder="Zahnarzt, Elternabend, ..." />
      </div>
      <label class="switch">
        <span>Ganztägig</span>
        <input v-model="allDay" type="checkbox" />
      </label>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="start">Beginn</label>
          <input id="start" class="input" type="date" value="2026-09-18" />
        </div>
        <div class="field">
          <label class="field-label" for="end">Ende</label>
          <input id="end" class="input" type="date" value="2026-09-18" />
        </div>
      </div>
      <div v-if="!allDay" class="field-row">
        <div class="field">
          <label class="field-label" for="from">Von</label>
          <input id="from" class="input" type="time" value="18:00" />
        </div>
        <div class="field">
          <label class="field-label" for="to">Bis</label>
          <input id="to" class="input" type="time" value="19:00" />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="repeat">Wiederholen</label>
        <select id="repeat" class="select">
          <option>Nie</option>
          <option>Täglich</option>
          <option>Wöchentlich</option>
          <option>Monatlich</option>
          <option>Jährlich</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="notes">Notizen</label>
        <textarea id="notes" class="textarea" placeholder="Optional"></textarea>
      </div>
      <label class="checkbox">
        <input v-model="checked" type="checkbox" />
        <span>Milch kaufen</span>
      </label>
    </section>
  </main>
</template>

<style scoped>
.showcase {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.form {
  padding: var(--space-5);
}
</style>
