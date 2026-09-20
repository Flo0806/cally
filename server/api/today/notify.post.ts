import { createError, defineEventHandler } from "nuxt/server";
import * as v from "valibot";
import { buildToday, todayDate } from "../../today/build";
import { notifyEvent } from "../../today/notify";
import { readValidatedBody } from "../../utils/validate";

const body = v.object({ key: v.pipe(v.string(), v.minLength(1)) });

// "Aufs Handy": push one of today's events to the phones it concerns
export default defineEventHandler(async (event) => {
  const { key } = await readValidatedBody(event, body);
  const today = await buildToday(todayDate());
  const target = today.events.find((e) => e.key === key);
  if (!target) throw createError({ statusCode: 404, message: "Termin nicht gefunden" });
  const sent = await notifyEvent(target);
  if (!sent.length) {
    throw createError({ statusCode: 400, message: "Niemand hat ein Handy-Topic eingetragen" });
  }
  return { sent };
});
