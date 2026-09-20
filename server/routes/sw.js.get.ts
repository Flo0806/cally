import { defineEventHandler, setResponseHeader } from "nuxt/server";
import { useRuntimeConfig } from "nitro/runtime-config";
import template from "../sw/worker.js?raw";

// The worker is served by us, not from public/: Vite's dev middleware would wrap a .js
// there into a module. Same route in dev and production.
export default defineEventHandler((event) => {
  const worker = template.replace("__VERSION__", useRuntimeConfig().public.version);
  setResponseHeader(event, "content-type", "text/javascript; charset=utf-8");
  setResponseHeader(event, "cache-control", "no-cache");
  setResponseHeader(event, "service-worker-allowed", "/");
  return worker;
});
