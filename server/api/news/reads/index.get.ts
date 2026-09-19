import { defineEventHandler } from "nuxt/server";
import * as v from "valibot";
import { listReads } from "../../../database/reads";
import { getValidatedQuery } from "../../../utils/validate";

const query = v.object({ memberId: v.pipe(v.string(), v.minLength(1)) });

export default defineEventHandler((event) => {
  const { memberId } = getValidatedQuery(event, query);
  return listReads(memberId);
});
