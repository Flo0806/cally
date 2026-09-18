import { createError, getQuery, readBody } from "nuxt/server";
import type { RequestEvent } from "nuxt/server";
import * as v from "valibot";

function validate<TSchema extends v.GenericSchema>(
  schema: TSchema,
  input: unknown,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);
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

export async function readValidatedBody<TSchema extends v.GenericSchema>(
  event: RequestEvent,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  return validate(schema, await readBody(event));
}

export function getValidatedQuery<TSchema extends v.GenericSchema>(
  event: RequestEvent,
  schema: TSchema,
): v.InferOutput<TSchema> {
  return validate(schema, getQuery(event));
}

export function requireParam(event: RequestEvent, name: string): string {
  const value = event.context.params?.[name];
  if (!value) throw createError({ statusCode: 400, message: `Parameter ${name} fehlt` });
  return value;
}
