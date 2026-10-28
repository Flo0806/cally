import { defineConfig } from "vitest/config";

// Tests talk to the running dev server over HTTP, so nothing of Nuxt is set up here
export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    // The rate limit test sends more than a hundred requests
    testTimeout: 60_000,
  },
});
