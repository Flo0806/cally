import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { deleteTodo } from "../../database/todos";
import { notifyChange } from "../../live/bus";
import { requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  await deleteTodo(requireParam(event, "id"));
  notifyChange(event, "todos");
  setResponseStatus(event, 204);
});
