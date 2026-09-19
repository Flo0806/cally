import { defineEventHandler, setResponseStatus } from "nuxt/server";
import * as v from "valibot";
import { addRead } from "../../../database/reads";
import { readValidatedBody, requireParam } from "../../../utils/validate";

const body = v.object({ memberId: v.pipe(v.string(), v.minLength(1)) });

export default defineEventHandler(async (event) => {
  const itemId = requireParam(event, "itemId");
  const { memberId } = await readValidatedBody(event, body);
  await addRead(itemId, memberId);
  setResponseStatus(event, 204);
});
