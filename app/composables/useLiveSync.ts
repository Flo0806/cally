import { useClientId } from "~/composables/useClientId";

interface Change {
  type: "events" | "todos";
  origin: string | null;
}

// Listens to /api/stream and raises "cally:changed" for what other devices changed. Our own
// changes are already in local state, the stream tells us their origin and we skip those.
export function useLiveSync() {
  const clientId = useClientId();
  const nuxtApp = useNuxtApp();

  onMounted(() => {
    const source = new EventSource("/api/stream");
    let connectedBefore = false;

    source.onopen = () => {
      // After a reconnect anything could have happened, reload both
      if (connectedBefore) {
        void nuxtApp.callHook("cally:changed", "events");
        void nuxtApp.callHook("cally:changed", "todos");
      }
      connectedBefore = true;
    };

    source.onmessage = (message) => {
      const change = JSON.parse(message.data) as Change;
      if (change.origin === clientId.value) return;
      void nuxtApp.callHook("cally:changed", change.type);
    };

    onUnmounted(() => source.close());
  });
}
