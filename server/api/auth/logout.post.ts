import { defineEventHandler } from "nuxt/server";
import { toLegacy } from "../../utils/compat";

export default defineEventHandler(async (event) => {
  await clearUserSession(toLegacy(event));
  return { ok: true };
});
