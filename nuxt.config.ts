// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  runtimeConfig: {
    weather: {
      latitude: "",
      longitude: "",
    },
  },
  css: ["@fontsource-variable/figtree", "~/assets/css/main.css", "~/assets/css/components.css"],
  app: {
    head: {
      htmlAttrs: { lang: "de" },
      title: "cally",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      ],
    },
  },
});
