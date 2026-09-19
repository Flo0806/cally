import { defineEventHandler, setResponseStatus } from "nuxt/server";
import * as v from "valibot";
import { removeRead } from "../../../database/reads";
import { getValidatedQuery, requireParam } from "../../../utils/validate";

const query = v.object({ memberId: v.pipe(v.string(), v.minLength(1)) });

export default defineEventHandler(async (event) => {
  const itemId = requireParam(event, "itemId");
  const { memberId } = getValidatedQuery(event, query);
  await removeRead(itemId, memberId);
  setResponseStatus(event, 204);
});
