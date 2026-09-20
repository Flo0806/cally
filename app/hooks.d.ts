// Runtime hooks the app raises itself. Data views subscribe with useRuntimeHook().
declare module "nuxt/app" {
  interface RuntimeNuxtHooks {
    // Something in that collection changed, on this device or another one. Reload it.
    "cally:changed": (what: "events" | "todos") => void | Promise<void>;
  }
}

export {};
