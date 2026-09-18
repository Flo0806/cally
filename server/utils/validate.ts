import { createError, readBody } from "nuxt/server";
import type { RequestEvent } from "nuxt/server";
import * as v from "valibot";

export async function readValidatedBody<TSchema extends v.GenericSchema>(
  event: RequestEvent,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  const result = v.safeParse(schema, await readBody(event));
  if (result.success) return result.output;
  throw createError({
    statusCode: 400,
    message: "Ungültige Eingabe",
    data: {
      issues: result.issues.map((issue) => ({
        path: issue.path?.map((segment) => String(segment.key)).join(".") ?? "",
        message: issue.message,
      })),
    },
  });
}

export function requireParam(event: RequestEvent, name: string): string {
  const value = event.context.params?.[name];
  if (!value) throw createError({ statusCode: 400, message: `Parameter ${name} fehlt` });
  return value;
}
