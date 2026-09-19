import { defineEventHandler, setResponseStatus } from "nuxt/server";
import * as v from "valibot";
import { removeCategoryHearts } from "../../../database/hearts";
import { getValidatedQuery } from "../../../utils/validate";

// Resets one category for one member, the only way hearts ever go down
const query = v.object({
  memberId: v.pipe(v.string(), v.minLength(1)),
  categoryId: v.pipe(v.string(), v.minLength(1)),
});

export default defineEventHandler(async (event) => {
  const { memberId, categoryId } = getValidatedQuery(event, query);
  await removeCategoryHearts(memberId, categoryId);
  setResponseStatus(event, 204);
});
