import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { deleteTodo } from "../../database/todos";
import { requireParam } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  await deleteTodo(requireParam(event, "id"));
  setResponseStatus(event, 204);
});
