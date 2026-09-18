import { defineEventHandler } from "nuxt/server";
import { rangeQuery } from "#shared/schemas";
import { expandEvents } from "#shared/occurrences";
import { listEventsInRange } from "../../database/events";
import { getValidatedQuery } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const { from, to } = getValidatedQuery(event, rangeQuery);
  return expandEvents(await listEventsInRange(from, to), from, to);
});
