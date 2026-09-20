import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { eventInput } from "#shared/schemas";
import { createEvent } from "../../database/events";
import { notifyChange } from "../../live/bus";
import { readValidatedBody } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, eventInput);
  const created = await createEvent(input);
  notifyChange(event, "events");
  setResponseStatus(event, 201);
  return created;
});
