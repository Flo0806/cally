<script setup lang="ts">
import { Heart, RefreshCw } from "@lucide/vue";
import type { NewsCategory, NewsItem } from "#shared/types";
import { formatRelative } from "~/utils/calendar";
import { api, useApi } from "~/utils/api";
import { useLookups } from "~/composables/useLookups";
import { useNewsHearts } from "~/composables/useNewsHearts";
import { useNewsReader } from "~/composables/useNewsReader";

const PREVIEW = 6;

const members = useLookups("members").items;
const reader = useNewsReader();
const hearts = useNewsHearts();
// Always current when the page opens: only the hydration payload counts as cached
const {
  data: news,
  status,
  refresh,
} = await useApi("/api/news", {
  key: "news",
  getCachedData: (key, nuxtApp) => (nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined),
});

// While the page is open, ask the server every few minutes whether the content changed
const STATUS_INTERVAL_MS = 5 * 60 * 1000;
const hasNewer = ref(false);
let statusTimer: ReturnType<typeof setInterval> | undefined;

async function checkStatus() {
  try {
    const current = await api<{ digest: string }>("/api/news/status");
    hasNewer.value = !!news.value && current.digest !== news.value.digest;
  } catch {
    // offline for a moment, the next tick tries again
  }
}

async function loadNewer() {
  await refresh();
  hasNewer.value = false;
}

// Ask who is reading every time the page opens, forget it when leaving
const readerOpen = ref(false);
onMounted(() => {
  reader.select(null);
  readerOpen.value = members.value.length > 0;
  statusTimer = setInterval(checkStatus, STATUS_INTERVAL_MS);
});
onUnmounted(() => {
  reader.select(null);
  clearInterval(statusTimer);
});

watch(reader.memberId, (id) => hearts.load(id), { immediate: true });

const readerName = computed(() => members.value.find((m) => m.id === reader.memberId.value)?.name);

// Hearted categories first, most hearts on top, the rest in registry order and dimmed
const ranked = computed(() => {
  const categories = news.value?.categories ?? [];
  const counts = hearts.countByCategory.value;
  const liked = categories
    .filter((c) => (counts.get(c.id) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  const rest = categories.filter((c) => !(counts.get(c.id) ?? 0));
  return { liked, rest };
});

const expanded = ref(new Set<string>());
const selected = ref<{ item: NewsItem; categoryId: string } | null>(null);
const detailOpen = computed({
  get: () => selected.value !== null,
  set: (value) => {
    if (!value) selected.value = null;
  },
});

function visible(category: NewsCategory): NewsItem[] {
  return expanded.value.has(category.id) ? category.items : category.items.slice(0, PREVIEW);
}

function toggleExpanded(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

const resetTarget = ref<NewsCategory | null>(null);
const resetOpen = computed({
  get: () => resetTarget.value !== null,
  set: (value) => {
    if (!value) resetTarget.value = null;
  },
});

async function resetCategory() {
  if (!resetTarget.value || !reader.memberId.value) return;
  try {
    await hearts.resetCategory(resetTarget.value.id, reader.memberId.value);
  } finally {
    resetTarget.value = null;
  }
}

async function heart(item: NewsItem, categoryId: string) {
  if (!reader.memberId.value) return;
  try {
    await hearts.toggle(item, categoryId, reader.memberId.value);
  } catch {
    // The detail dialog shows errors, a failed tap here just leaves the heart as it was
  }
}
</script>

<template>
  <div class="news">
    <div class="bar">
      <button class="btn" type="button" @click="readerOpen = true">
        {{ readerName ? `${readerName} liest` : "Wer liest?" }}
      </button>
      <button
        v-if="hasNewer"
        class="btn btn-primary"
        type="button"
        :disabled="status === 'pending'"
        @click="loadNewer"
      >
        <RefreshCw :size="18" /> Neue Nachrichten
      </button>
      <span v-else-if="news" class="stand text-muted"
        >Stand {{ formatRelative(news.fetchedAt) }}</span
      >
    </div>

    <template v-if="news">
      <div v-for="(group, index) in [ranked.liked, ranked.rest]" :key="index">
        <p v-if="index === 1 && ranked.liked.length && group.length" class="divider text-muted">
          Weitere Themen
        </p>
        <div class="grid" :class="{ dimmed: index === 1 && ranked.liked.length }">
          <section v-for="category in group" :key="category.id" class="card category">
            <h2 class="category-title">
              {{ category.label }}
              <button
                v-if="hearts.countByCategory.value.get(category.id)"
                class="category-hearts tabular"
                type="button"
                title="Zurücksetzen"
                @click="resetTarget = category"
              >
                <Heart :size="14" fill="currentColor" />
                {{ hearts.countByCategory.value.get(category.id) }}
              </button>
            </h2>
            <ul class="items">
              <li v-for="item in visible(category)" :key="item.id" class="row">
                <button
                  class="item"
                  type="button"
                  @click="selected = { item, categoryId: category.id }"
                >
                  <span class="item-title">{{ item.title }}</span>
                  <span class="item-meta text-muted">
                    {{ item.source }} · {{ formatRelative(item.published) }}
                  </span>
                </button>
                <button
                  class="btn btn-ghost btn-icon heart"
                  :class="{ on: hearts.has(item.id) }"
                  type="button"
                  :disabled="!reader.memberId.value"
                  :aria-pressed="hearts.has(item.id)"
                  aria-label="Gefällt mir"
                  @click="heart(item, category.id)"
                >
                  <Heart :size="20" :fill="hearts.has(item.id) ? 'currentColor' : 'none'" />
                </button>
              </li>
            </ul>
            <button
              v-if="category.items.length > PREVIEW"
              class="btn btn-ghost more"
              type="button"
              @click="toggleExpanded(category.id)"
            >
              {{ expanded.has(category.id) ? "Weniger" : `Alle ${category.items.length}` }}
            </button>
          </section>
        </div>
      </div>
    </template>
    <p v-else class="empty text-muted">Nachrichten sind gerade nicht erreichbar.</p>

    <NewsReaderDialog v-model="readerOpen" @select="reader.select" />
    <AppDialog v-model="resetOpen" title="Herzen zurücksetzen?" width="480px">
      <p v-if="resetTarget">
        Alle {{ hearts.countByCategory.value.get(resetTarget.id) }} Herzen bei „{{
          resetTarget.label
        }}" für {{ readerName }} werden gelöscht. Die Kategorie rutscht wieder nach unten.
      </p>
      <template #actions>
        <button class="btn btn-ghost" type="button" @click="resetTarget = null">Abbrechen</button>
        <button class="btn btn-danger" type="button" @click="resetCategory">Zurücksetzen</button>
      </template>
    </AppDialog>
    <NewsDetailDialog
      v-model="detailOpen"
      :item="selected?.item ?? null"
      :category-id="selected?.categoryId ?? null"
    />
  </div>
</template>

<style scoped>
.news {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5) var(--space-6);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.stand {
  font-size: var(--text-sm);
}

.divider {
  margin: var(--space-5) 0 var(--space-3);
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

/* Quieter, still readable: the cards recede, the text keeps its contrast */
.grid.dimmed .category {
  background: var(--surface-muted);
  border-color: transparent;
}

.grid.dimmed .category-title {
  color: var(--ink-muted);
}

.category {
  padding: var(--space-4) var(--space-4) var(--space-2);
}

.category-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  padding: 0 var(--space-2);
}

.category-hearts {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 32px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
}

.items {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.item {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  min-height: 56px;
  padding: var(--space-2) var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.item:active {
  background: var(--surface-muted);
}

.item-title {
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  font-size: var(--text-sm);
}

.heart {
  flex: none;
  color: var(--ink-faint);
}

.heart.on {
  color: var(--accent);
}

.more {
  width: 100%;
  margin-top: var(--space-1);
}

.empty {
  padding: var(--space-6) 0;
  text-align: center;
}
</style>
