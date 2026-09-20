import type { RequestEvent } from "nuxt/server";

// Change notifications for connected clients. In memory: one container, one process.
export type ChangeType = "events" | "todos";

export interface Change {
  type: ChangeType;
  // Client id of the device that made the change, so it can ignore its own echo
  origin: string | null;
  at: number;
}

type Listener = (change: Change) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publish(type: ChangeType, origin: string | null): void {
  const change: Change = { type, origin, at: Date.now() };
  for (const listener of listeners) listener(change);
}

// Routes call this after a successful write; the header comes from the client's api()
export function notifyChange(event: RequestEvent, type: ChangeType): void {
  publish(type, event.req.headers.get("x-cally-client"));
}

export function subscriberCount(): number {
  return listeners.size;
}
