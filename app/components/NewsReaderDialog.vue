<script setup lang="ts">
// Switching the reader, the mandatory first choice happens inline on the page
const open = defineModel<boolean>({ required: true });
defineProps<{ current: string | null }>();
const emit = defineEmits<{ select: [memberId: string] }>();

function pick(id: string) {
  emit("select", id);
  open.value = false;
}
</script>

<template>
  <AppDialog v-model="open" title="Wer liest?" width="560px">
    <NewsReaderPick :current="current" @select="pick" />
  </AppDialog>
</template>
