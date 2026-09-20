import { defineEventHandler, setResponseStatus } from "nuxt/server";
import * as v from "valibot";
import { deleteEvent, excludeOccurrence } from "../../database/events";
import { notifyChange } from "../../live/bus";
import { getValidatedQuery, requireParam } from "../../utils/validate";

// ?occurrence=<start> removes a single instance of a series instead of the whole event
const query = v.object({ occurrence: v.optional(v.string()) });

export default defineEventHandler(async (event) => {
  const id = requireParam(event, "id");
  const { occurrence } = getValidatedQuery(event, query);
  if (occurrence) {
    const updated = await excludeOccurrence(id, occurrence);
    notifyChange(event, "events");
    return updated;
  }
  await deleteEvent(id);
  notifyChange(event, "events");
  setResponseStatus(event, 204);
});
