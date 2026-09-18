import { defineEventHandler } from "nuxt/server";
import { eventInput } from "#shared/schemas";
import { updateEvent } from "../../database/events";
import { readValidatedBody, requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const id = requireParam(event, "id");
  const input = await readValidatedBody(event, eventInput);
  return updateEvent(id, input);
});
