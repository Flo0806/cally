import type { RequestEvent } from "nuxt/server";

// TODO: workaround, remove once nuxt-auth-utils ships for Nuxt 5 / h3 v2 (atinux/nuxt-auth-utils#519).
// The module is written for h3 v1. Nuxt 5 runs it through its compat layer, where the
// event is the same v2 event underneath; only the types disagree. Cast once, here.
export type LegacyEvent = Parameters<typeof clearUserSession>[0];

export function toLegacy(event: RequestEvent): LegacyEvent {
  return event as unknown as LegacyEvent;
}

export function fromLegacy(event: LegacyEvent): RequestEvent {
  return event as unknown as RequestEvent;
}
