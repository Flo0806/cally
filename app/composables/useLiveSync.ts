import { useClientId } from "~/composables/useClientId";

interface Change {
  type: "events" | "todos";
  origin: string | null;
}

const IDLE_RETRY_MS = 30 * 1000;

// Reload when nobody is in a dialog, otherwise try again later
function reloadWhenIdle() {
  if (document.querySelector("dialog[open]")) {
    setTimeout(reloadWhenIdle, IDLE_RETRY_MS);
    return;
  }
  location.reload();
}

// Listens to /api/stream and raises "cally:changed" for what other devices changed. Our own
// changes are already in local state, the stream tells us their origin and we skip those.
// A new server version reloads the page, the tablet never navigates on its own.
export function useLiveSync() {
  const clientId = useClientId();
  const nuxtApp = useNuxtApp();
  const version = useRuntimeConfig().public.version;

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

    source.addEventListener("hello", (message) => {
      const server = JSON.parse(message.data) as { version: string };
      if (server.version !== version) reloadWhenIdle();
    });

    source.onmessage = (message) => {
      const change = JSON.parse(message.data) as Change;
      if (change.origin === clientId.value) return;
      void nuxtApp.callHook("cally:changed", change.type);
    };

    onUnmounted(() => source.close());
  });
}
