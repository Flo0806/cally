import { defineEventHandler } from "nuxt/server";
import { listLookups } from "../../database/lookups";

export default defineEventHandler(() => listLookups("members"));
