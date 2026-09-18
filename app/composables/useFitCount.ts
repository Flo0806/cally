import type { MaybeRefOrGetter } from "vue";

// How many fixed-height items fit into an element, kept current by a ResizeObserver.
// Starts at 1 because the server cannot measure.
export function useFitCount(
  element: MaybeRefOrGetter<HTMLElement | HTMLElement[] | null | undefined>,
  { itemHeight, gap }: { itemHeight: number; gap: number },
) {
  const count = ref(1);
  let observer: ResizeObserver | undefined;

  onMounted(() => {
    const value = toValue(element);
    const target = Array.isArray(value) ? value[0] : value;
    if (!target) return;
    observer = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect.height ?? 0;
      count.value = Math.max(1, Math.floor((height + gap) / (itemHeight + gap)));
    });
    observer.observe(target);
  });

  onUnmounted(() => observer?.disconnect());

  return count;
}
