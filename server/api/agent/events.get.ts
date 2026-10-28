import { getQuery } from "nuxt/server";
import { defineAgentHandler } from "../../agent/handler";
import { eventSearchQuery, searchOccurrences } from "../../agent/events";
import { parseAgentInput } from "../../agent/validate";

export default defineAgentHandler((event) =>
  searchOccurrences(parseAgentInput(eventSearchQuery, getQuery(event))),
);
