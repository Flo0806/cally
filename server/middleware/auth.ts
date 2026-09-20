import { defineEventHandler } from "nuxt/server";
import { useRuntimeConfig } from "nitro/runtime-config";
import { toLegacy } from "../utils/compat";

// Every API call needs a session. The module's own session endpoint and logout stay open.
const OPEN = new Set(["/api/_auth/session", "/api/auth/logout"]);

export default defineEventHandler(async (event) => {
  const path = event.url.pathname;
  if (!path.startsWith("/api/") || OPEN.has(path)) return;
  if (useRuntimeConfig().public.authDisabled === "1") return;
  await requireUserSession(toLegacy(event));
});
