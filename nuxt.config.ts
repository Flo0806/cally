// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  modules: ["nuxt-auth-utils", "nuxt-pigeon", "nuxt-spyglass"],
  nuxtPigeon: {
    channels: {
      // Server and token come from PIGEON_NTFY_*, the topic is set per message (one per member)
      ntfy: { topic: "cally_app" },
    },
  },
  nitro: {
    experimental: { database: true, tasks: true },
    scheduledTasks: {
      "*/30 * * * *": "news:pull",
      "*/5 * * * *": "reminders:push",
    },
  },
  runtimeConfig: {
    // Comma separated, the only Google accounts that may log in
    allowedEmails: "",
    // Sealed cookie, one year: the kitchen tablet must not ask again every week
    session: {
      name: "cally-session",
      maxAge: 365 * 24 * 60 * 60,
    },
    public: {
      // "1" skips the login, local development only
      authDisabled: "",
    },
    weather: {
      latitude: "",
      longitude: "",
    },
    // TomTom Routing API key, drive times with traffic. Without it OSRM times are used.
    tomtomKey: "",
    // "1" enables the phone reminders task. Off in local dev so tests do not page anyone.
    reminders: "",
  },
  css: ["~/assets/css/main.css", "~/assets/css/components.css"],
  app: {
    head: {
      htmlAttrs: { lang: "de" },
      titleTemplate: "%s %separator cally",
      templateParams: { separator: "·" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "description", content: "Familienkalender mit Todos und Nachrichten." },
        // Private app on a kitchen tablet, never meant for search engines
        { name: "robots", content: "noindex, nofollow" },
        { name: "theme-color", content: "#0b6e7a" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
      ],
      link: [
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: "/fonts/figtree-latin.woff2",
          crossorigin: "",
        },
      ],
    },
  },
});
