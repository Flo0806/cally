import { defineEventHandler, useRuntimeConfig } from "nuxt/server";
import template from "../sw/worker.js?raw";

// The worker is served by us, not from public/: Vite's dev middleware would wrap a .js
// there into a module. Same route in dev and production.
export default defineEventHandler((event) => {
  const worker = template.replace("__VERSION__", useRuntimeConfig().public.version);
  event.res.headers.set("content-type", "text/javascript; charset=utf-8");
  event.res.headers.set("cache-control", "no-cache");
  event.res.headers.set("service-worker-allowed", "/");
  return worker;
});
