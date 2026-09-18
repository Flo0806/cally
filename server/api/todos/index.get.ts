import { defineEventHandler } from "nuxt/server";
import { listTodos } from "../../database/todos";

export default defineEventHandler(() => listTodos());
