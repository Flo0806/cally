import { defineEventHandler } from "nuxt/server";
import { heartInput } from "#shared/schemas";
import { addHeart } from "../../../database/hearts";
import { readValidatedBody, requireParam } from "../../../utils/validate";

export default defineEventHandler(async (event) => {
  const itemId = requireParam(event, "itemId");
  const input = await readValidatedBody(event, heartInput);
  return addHeart(itemId, input);
});
