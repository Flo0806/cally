import { defineEventHandler } from "nuxt/server";
import { getEvent } from "../../database/events";
import { requireParam } from "../../utils/validate";

export default defineEventHandler((event) => getEvent(requireParam(event, "id")));
