import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { deleteLookup } from "../../database/lookups";
import { requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  await deleteLookup("categories", requireParam(event, "id"));
  setResponseStatus(event, 204);
});
