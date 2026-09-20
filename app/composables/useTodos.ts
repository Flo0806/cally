import type { Todo } from "#shared/types";
import type { TodoInput, TodoPatch } from "#shared/schemas";
import { api } from "~/utils/api";

export function useTodos() {
  const items = useState<Todo[]>("todos", () => []);
  const loaded = useState("todos:loaded", () => false);

  const open = computed(() => items.value.filter((todo) => !todo.done));
  const done = computed(() => items.value.filter((todo) => todo.done));

  async function load(force = false) {
    if (loaded.value && !force) return;
    items.value = await api<Todo[]>("/api/todos");
    loaded.value = true;
  }

  async function add(input: TodoInput) {
    const created = await api<Todo>("/api/todos", { method: "POST", body: input });
    items.value = [...items.value, created];
    return created;
  }

  async function update(id: string, patch: TodoPatch) {
    const updated = await api<Todo>(`/api/todos/${id}`, { method: "PATCH", body: patch });
    items.value = items.value.map((todo) => (todo.id === id ? updated : todo));
    return updated;
  }

  function toggle(todo: Todo) {
    return update(todo.id, { done: !todo.done });
  }

  async function remove(id: string) {
    await api(`/api/todos/${id}`, { method: "DELETE" });
    items.value = items.value.filter((todo) => todo.id !== id);
  }

  async function clearDone() {
    await api("/api/todos/done", { method: "DELETE" });
    items.value = items.value.filter((todo) => !todo.done);
  }

  // Changes from other devices
  useRuntimeHook("cally:changed", (what) => {
    if (what === "todos") return load(true);
  });

  return { items, open, done, load, add, update, toggle, remove, clearDone };
}
