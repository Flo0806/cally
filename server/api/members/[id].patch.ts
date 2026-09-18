import { defineEventHandler } from "nuxt/server";
import { lookupPatch } from "#shared/schemas";
import { updateLookup } from "../../database/lookups";
import { readValidatedBody, requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const id = requireParam(event, "id");
  const patch = await readValidatedBody(event, lookupPatch);
  return updateLookup("members", id, patch);
});
