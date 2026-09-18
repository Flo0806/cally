import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { lookupInput } from "#shared/schemas";
import { createLookup } from "../../database/lookups";
import { readValidatedBody } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, lookupInput);
  const created = await createLookup("categories", input);
  setResponseStatus(event, 201);
  return created;
});
