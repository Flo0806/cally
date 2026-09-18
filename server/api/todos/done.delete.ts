import { defineEventHandler, setResponseStatus } from "nuxt/server";
import { deleteDoneTodos } from "../../database/todos";

// Static segment, so it wins over [id] for DELETE /api/todos/done
export default defineEventHandler(async (event) => {
  await deleteDoneTodos();
  setResponseStatus(event, 204);
});
