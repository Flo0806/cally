import { defineEventHandler } from "nuxt/server";
import * as v from "valibot";
import type { Today } from "#shared/types";
import { dateString } from "#shared/schemas";
import { buildToday, todayDate } from "../today/build";
import { getValidatedQuery } from "../utils/validate";

const query = v.object({ date: v.optional(dateString) });

export default defineEventHandler((event): Promise<Today> => {
  const { date } = getValidatedQuery(event, query);
  return buildToday(date ?? todayDate());
});
