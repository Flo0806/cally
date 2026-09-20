import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { todoInput } from "#shared/schemas";
import { createTodo } from "../../database/todos";
import { notifyChange } from "../../live/bus";
import { readValidatedBody } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, todoInput);
  const created = await createTodo(input);
  notifyChange(event, "todos");
  setResponseStatus(event, 201);
  return created;
});
