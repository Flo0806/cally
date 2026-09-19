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
      title: "cally",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
