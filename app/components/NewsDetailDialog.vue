<script setup lang="ts">
import { ExternalLink, Heart } from "@lucide/vue";
import type { NewsItem } from "#shared/types";
import { formatRelative } from "~/utils/calendar";
import { ApiError } from "~/utils/api";
import { useNewsHearts } from "~/composables/useNewsHearts";
import { useNewsReader } from "~/composables/useNewsReader";

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ item: NewsItem | null; categoryId: string | null }>();

const hearts = useNewsHearts();
const reader = useNewsReader();
const error = ref("");
const busy = ref(false);

const hearted = computed(() => !!props.item && hearts.has(props.item.id));

async function toggle() {
  if (!props.item || !props.categoryId || !reader.memberId.value) return;
  busy.value = true;
  error.value = "";
  try {
    await hearts.toggle(props.item, props.categoryId, reader.memberId.value);
  } catch (e) {
    error.value = (e as ApiError).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AppDialog v-model="open" :title="item?.title ?? ''" width="640px">
    <template v-if="item">
      <p class="meta text-muted">{{ item.source }} · {{ formatRelative(item.published) }}</p>
      <p v-if="item.summary" class="summary">{{ item.summary }}</p>
      <p v-else class="summary text-muted">
        Kein Anriss vorhanden, der Artikel öffnet sich in der Quelle.
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </template>

    <template #actions>
      <button
        class="btn heart"
        :class="{ 'btn-primary': hearted }"
        type="button"
        :disabled="busy || !reader.memberId.value"
        @click="toggle"
      >
        <Heart :size="20" :fill="hearted ? 'currentColor' : 'none'" />
        {{ hearted ? "Gefällt mir" : "Gefällt mir?" }}
      </button>
      <a v-if="item" class="btn" :href="item.link" target="_blank" rel="noopener">
        Öffnen <ExternalLink :size="18" />
      </a>
    </template>
  </AppDialog>
</template>

<style scoped>
.meta {
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
}

.summary {
  font-size: var(--text-lg);
  line-height: 1.5;
}

.error {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--danger);
}

.heart {
  margin-right: auto;
}
</style>
