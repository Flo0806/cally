import { defineEventHandler } from "nuxt/server";
import { todoPatch } from "#shared/schemas";
import { updateTodo } from "../../database/todos";
import { notifyChange } from "../../live/bus";
import { readValidatedBody, requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const id = requireParam(event, "id");
  const patch = await readValidatedBody(event, todoPatch);
  const updated = await updateTodo(id, patch);
  notifyChange(event, "todos");
  return updated;
});
