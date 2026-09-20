import { defineEventHandler } from "nuxt/server";
import { eventInput } from "#shared/schemas";
import { updateEvent } from "../../database/events";
import { notifyChange } from "../../live/bus";
import { readValidatedBody, requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const id = requireParam(event, "id");
  const input = await readValidatedBody(event, eventInput);
  const updated = await updateEvent(id, input);
  notifyChange(event, "events");
  return updated;
});
