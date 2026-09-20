// Registers the service worker in production. Dev stays plain so nothing is cached while
// coding, unless NUXT_PUBLIC_SW=1 asks for it to test the worker.
export default defineNuxtPlugin(() => {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.dev && useRuntimeConfig().public.sw !== "1") return;
  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("[sw] registration failed", error);
  });
});
