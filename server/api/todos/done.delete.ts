import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { deleteDoneTodos } from "../../database/todos";
import { notifyChange } from "../../live/bus";

// Static segment, so it wins over [id] for DELETE /api/todos/done
export default defineEventHandler(async (event) => {
  await deleteDoneTodos();
  notifyChange(event, "todos");
  setResponseStatus(event, 204);
});
