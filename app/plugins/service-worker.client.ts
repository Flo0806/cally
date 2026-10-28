// Production only. In dev the chunk names carry no hash and the version never changes, so the
// worker would serve stale code forever; one left over from earlier is removed.
export default defineNuxtPlugin(() => {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.dev) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .then((removed) => {
        // This page itself still came through the old worker, the reload loads it fresh
        if (removed.some(Boolean) && navigator.serviceWorker.controller) location.reload();
      })
      .catch((error) => console.warn("[sw] unregister failed", error));
    return;
  }
  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("[sw] registration failed", error);
  });
});
