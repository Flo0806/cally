<script setup lang="ts">
import { Check, Globe, Heart, Newspaper } from "@lucide/vue";
import type { NewsItem } from "#shared/types";
import { formatRelative } from "~/utils/calendar";

defineProps<{
  item: NewsItem;
  hearted: boolean;
  read: boolean;
  canAct: boolean;
}>();
defineEmits<{ open: []; heart: []; read: [] }>();

// Broken or missing images fall back to placeholders, the row keeps its shape either way
const imageFailed = ref(false);
const iconFailed = ref(false);

function host(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
</script>

<template>
  <li class="row" :class="{ 'is-read': read }">
    <button class="item" type="button" @click="$emit('open')">
      <span class="item-text">
        <span class="item-title">{{ item.title }}</span>
        <span class="item-meta text-muted">
          <img
            v-if="host(item.sourceUrl) && !iconFailed"
            class="favicon"
            :src="`/api/favicon/${host(item.sourceUrl)}`"
            alt=""
            loading="lazy"
            width="16"
            height="16"
            @error="iconFailed = true"
          />
          <Globe v-else :size="16" class="favicon-fallback" />
          {{ item.source }} · {{ formatRelative(item.published) }}
        </span>
      </span>
      <img
        v-if="item.image && !imageFailed"
        class="thumb"
        :src="item.image"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
      />
      <span v-else class="thumb thumb-placeholder" aria-hidden="true">
        <Newspaper :size="28" />
      </span>
    </button>
    <span class="row-actions">
      <button
        class="btn btn-ghost btn-icon action"
        :class="{ on: read }"
        type="button"
        :disabled="!canAct"
        :aria-pressed="read"
        aria-label="Gelesen"
        @click="$emit('read')"
      >
        <Check :size="20" />
      </button>
      <button
        class="btn btn-ghost btn-icon action heart"
        :class="{ on: hearted }"
        type="button"
        :disabled="!canAct"
        :aria-pressed="hearted"
        aria-label="Gefällt mir"
        @click="$emit('heart')"
      >
        <Heart :size="20" :fill="hearted ? 'currentColor' : 'none'" />
      </button>
    </span>
  </li>
</template>

<style scoped>
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
  align-items: center;
  gap: var(--space-3);
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

.item-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
}

/* Light plate behind the icon: brand icons are drawn for white and sink into our surfaces */
.favicon {
  box-sizing: content-box;
  width: 16px;
  height: 16px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: #fff;
}

.thumb {
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--surface-muted);
}

.thumb-placeholder {
  display: grid;
  place-items: center;
  color: var(--ink-faint);
}

.favicon-fallback {
  flex: none;
  color: var(--ink-faint);
}

.row-actions {
  display: flex;
  flex: none;
}

.action {
  color: var(--ink-faint);
}

.action.on {
  color: var(--accent);
}

/* Read: the title steps back, the actions stay reachable */
.is-read .item-title {
  color: var(--ink-muted);
  font-weight: 500;
}

.is-read .thumb {
  opacity: 0.6;
}
</style>
