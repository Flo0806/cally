// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  nitro: {
    experimental: { database: true, tasks: true },
    scheduledTasks: {
      "*/30 * * * *": "news:pull",
    },
  },
  runtimeConfig: {
    weather: {
      latitude: "",
      longitude: "",
    },
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
