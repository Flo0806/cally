import type { MaybeRefOrGetter } from "vue";

// How many fixed-height items fit into the first `item` inside `container`.
// Observes the stable container, not the item: v-for cells get recreated on month change
// and a detached element would report height 0 forever. Starts at 1, the server cannot measure.
export function useFitCount(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  { item, itemHeight, gap }: { item: string; itemHeight: number; gap: number },
) {
  const count = ref(1);
  let resize: ResizeObserver | undefined;
  let mutation: MutationObserver | undefined;

  onMounted(() => {
    const target = toValue(container);
    if (!target) return;

    const measure = () => {
      const height = target.querySelector<HTMLElement>(item)?.clientHeight ?? 0;
      // 0 means hidden (e.g. phone agenda), keep the last good value
      if (height > 0) count.value = Math.max(1, Math.floor((height + gap) / (itemHeight + gap)));
    };

    resize = new ResizeObserver(measure);
    resize.observe(target);
    mutation = new MutationObserver(measure);
    mutation.observe(target, { childList: true });
  });

  onUnmounted(() => {
    resize?.disconnect();
    mutation?.disconnect();
  });

  return count;
}
