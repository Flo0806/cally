<script setup lang="ts">
import { ALargeSmall, ChevronDown, Heart, RefreshCw, Sparkles } from "@lucide/vue";
import { Temporal } from "temporal-polyfill";
import type { NewsCategory, NewsItem } from "#shared/types";
import { formatRelative } from "~/utils/calendar";
import { api, useApi } from "~/utils/api";
import { useLookups } from "~/composables/useLookups";
import { useNewsHearts } from "~/composables/useNewsHearts";
import { useNewsReads } from "~/composables/useNewsReads";
import { useNewsReader } from "~/composables/useNewsReader";

useHead({ title: "Nachrichten" });
definePageMeta({ middleware: "news-reader" });

const PREVIEW = 6;
const FOR_YOU_START = 10;
const FOR_YOU_STEP = 5;

const members = useLookups("members").items;
const reader = useNewsReader();
const hearts = useNewsHearts();
const reads = useNewsReads();

// Client only: the server cache answers in milliseconds, and rendering 250 kB of news into
// the HTML plus the hydration payload would only slow the page down. Always fresh on open.
const {
  data: news,
  status,
  refresh,
} = useApi("/api/news", {
  key: "news",
  server: false,
  getCachedData: () => undefined,
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

// The reader comes from a cookie; without one the page shows only the choice
const readerOpen = ref(false);
onMounted(() => {
  statusTimer = setInterval(checkStatus, STATUS_INTERVAL_MS);
});
onUnmounted(() => clearInterval(statusTimer));

const forYouLimit = ref(FOR_YOU_START);

watch(
  reader.memberId,
  (id) => {
    forYouLimit.value = FOR_YOU_START;
    return Promise.all([hearts.load(id), reads.load(id)]);
  },
  { immediate: true },
);

const readerMember = computed(() => members.value.find((m) => m.id === reader.memberId.value));
const readerName = computed(() => readerMember.value?.name);

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

// "Für dich": unread items from hearted categories. Each heart on a category buys its items
// two hours of freshness, so favourites float up without hiding real news.
const forYou = computed(() => {
  const counts = hearts.countByCategory.value;
  const now = Temporal.Now.instant();
  const scored: { item: NewsItem; categoryId: string; score: number }[] = [];
  for (const category of ranked.value.liked) {
    const bonus = (counts.get(category.id) ?? 0) * 2;
    for (const item of category.items) {
      if (reads.has(item.id)) continue;
      const hoursAgo = now.since(Temporal.Instant.from(item.published)).total("hours");
      scored.push({ item, categoryId: category.id, score: hoursAgo - bonus });
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return { total: scored.length, shown: scored.slice(0, forYouLimit.value) };
});

// Larger type for reading from across the kitchen, remembered per tablet
const LARGE_KEY = "cally:news-large";
const large = ref(false);
function toggleLarge() {
  large.value = !large.value;
  try {
    localStorage.setItem(LARGE_KEY, large.value ? "1" : "");
  } catch {
    // storage unavailable, the choice just does not persist
  }
}

// Cards start collapsed, only the opened ones are remembered per tablet
const OPEN_KEY = "cally:news-open";
const opened = ref(new Set<string>());
onMounted(() => {
  try {
    opened.value = new Set(JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]") as string[]);
    large.value = !!localStorage.getItem(LARGE_KEY);
  } catch {
    // storage unavailable, everything stays collapsed until tapped
  }
});

function isCollapsed(id: string): boolean {
  return !opened.value.has(id);
}

function toggleCollapsed(id: string) {
  const next = new Set(opened.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  opened.value = next;
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
  } catch {
    // see above
  }
}

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

async function markRead(item: NewsItem) {
  if (!reader.memberId.value) return;
  try {
    await reads.toggle(item, reader.memberId.value);
  } catch {
    // same as above
  }
}
</script>

<template>
  <div class="news" :class="{ large }">
    <div class="bar">
      <button
        v-if="readerMember"
        class="reader"
        type="button"
        :style="{ '--person': `var(--event-${readerMember.color})` }"
        title="Wechseln"
        @click="readerOpen = true"
      >
        <span class="reader-dot" />
        {{ readerMember.name }} liest
      </button>
      <div class="bar-right">
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
        <button
          class="btn btn-icon"
          :class="{ 'btn-primary': large }"
          type="button"
          :aria-pressed="large"
          aria-label="Große Schrift"
          title="Große Schrift"
          @click="toggleLarge"
        >
          <ALargeSmall :size="22" />
        </button>
      </div>
    </div>

    <section v-if="!readerMember || reader.mustConfirm.value" class="card gate">
      <h2 class="gate-title">Wer liest?</h2>
      <p class="text-muted">
        {{
          readerMember
            ? `Zuletzt ${readerMember.name}. Einmal antippen, dann geht es weiter.`
            : "Nachrichten gibt es nur mit Namen: die Herzen und das Gelesene gehören dir."
        }}
      </p>
      <NewsReaderPick :current="reader.memberId.value" @select="reader.select" />
    </section>

    <template v-else-if="news">
      <section v-if="ranked.liked.length" class="card for-you">
        <div class="category-head">
          <h2 class="category-title for-you-title"><Sparkles :size="22" /> Für {{ readerName }}</h2>
          <span class="category-count text-muted tabular">{{ forYou.total }} ungelesen</span>
        </div>
        <ul v-if="forYou.shown.length" class="items">
          <NewsItemRow
            v-for="entry in forYou.shown"
            :key="entry.item.id"
            :item="entry.item"
            :hearted="hearts.has(entry.item.id)"
            :read="false"
            :can-act="true"
            @open="selected = { item: entry.item, categoryId: entry.categoryId }"
            @heart="heart(entry.item, entry.categoryId)"
            @read="markRead(entry.item)"
          />
        </ul>
        <p v-else class="empty-inline text-muted">Alles gelesen. Neues kommt alle 30 Minuten.</p>
        <button
          type="button"
          v-if="forYou.total > forYou.shown.length"
          class="btn btn-ghost more"
          @click="forYouLimit += FOR_YOU_STEP"
        >
          Mehr zeigen
        </button>
      </section>

      <div v-for="(group, index) in [ranked.liked, ranked.rest]" :key="index">
        <p v-if="index === 1 && ranked.liked.length && group.length" class="divider text-muted">
          Weitere Themen
        </p>
        <div class="grid" :class="{ dimmed: index === 1 && ranked.liked.length }">
          <section
            v-for="category in group"
            :key="category.id"
            class="card category"
            :class="{ collapsed: isCollapsed(category.id) }"
          >
            <div class="category-head">
              <h2 class="category-title">
                <button
                  class="category-toggle"
                  type="button"
                  :aria-expanded="!isCollapsed(category.id)"
                  @click="toggleCollapsed(category.id)"
                >
                  <ChevronDown :size="22" class="chevron" />
                  {{ category.label }}
                  <span v-if="isCollapsed(category.id)" class="category-count text-muted tabular">
                    {{ category.items.length }}
                  </span>
                </button>
              </h2>
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
            </div>

            <template v-if="!isCollapsed(category.id)">
              <ul class="items">
                <NewsItemRow
                  v-for="item in visible(category)"
                  :key="item.id"
                  :item="item"
                  :hearted="hearts.has(item.id)"
                  :read="reads.has(item.id)"
                  :can-act="!!reader.memberId.value"
                  @open="selected = { item, categoryId: category.id }"
                  @heart="heart(item, category.id)"
                  @read="markRead(item)"
                />
              </ul>
              <button
                type="button"
                v-if="category.items.length > PREVIEW"
                class="btn btn-ghost more"
                @click="toggleExpanded(category.id)"
              >
                {{ expanded.has(category.id) ? "Weniger" : `Alle ${category.items.length}` }}
              </button>
            </template>
          </section>
        </div>
      </div>
    </template>
    <p
      v-else-if="readerMember && (status === 'pending' || status === 'idle')"
      class="empty text-muted"
    >
      Nachrichten werden geladen ...
    </p>
    <p v-else-if="readerMember" class="empty text-muted">
      Nachrichten sind gerade nicht erreichbar.
    </p>

    <NewsReaderDialog
      v-model="readerOpen"
      :current="reader.memberId.value"
      @select="reader.select"
    />
    <NewsDetailDialog
      v-model="detailOpen"
      :item="selected?.item ?? null"
      :category-id="selected?.categoryId ?? null"
    />
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
  </div>
</template>

<style scoped>
.news {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5) var(--space-6);
}

/* One notch up for everything on the page, the components inherit it */
.news.large {
  --text-sm: 1.0625rem;
  --text-md: 1.25rem;
  --text-lg: 1.5rem;
  --text-xl: 1.875rem;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.reader {
  --person: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch);
  padding: 0 var(--space-4) 0 var(--space-3);
  border: 2px solid var(--person);
  border-radius: 999px;
  background: color-mix(in srgb, var(--person) 14%, var(--surface));
  color: var(--ink);
  font-size: var(--text-lg);
  font-weight: 700;
  cursor: pointer;
}

.reader-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--person);
}

.gate {
  max-width: 720px;
  margin: var(--space-6) auto;
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.gate-title {
  margin-bottom: var(--space-2);
}

.gate .text-muted {
  margin-bottom: var(--space-5);
}

.bar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.stand {
  font-size: var(--text-sm);
}

.for-you {
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-4) var(--space-2);
  border-color: var(--accent);
}

.for-you .category-head {
  min-height: var(--touch);
  padding: 0 var(--space-2);
}

.for-you-title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--accent);
}

.empty-inline {
  padding: var(--space-3) var(--space-2) var(--space-4);
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
  padding: var(--space-2) var(--space-4) var(--space-2);
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.category-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  min-height: var(--touch);
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.category-toggle:active {
  background: var(--surface-muted);
}

.chevron {
  flex: none;
  color: var(--ink-faint);
  transition: transform 160ms ease;
}

.collapsed .chevron {
  transform: rotate(-90deg);
}

.category-title {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.category-count {
  font-size: var(--text-sm);
  font-weight: 600;
}

.category-hearts {
  display: inline-flex;
  flex: none;
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

.more {
  width: 100%;
  margin-top: var(--space-1);
}

.empty {
  padding: var(--space-6) 0;
  text-align: center;
}
</style>
