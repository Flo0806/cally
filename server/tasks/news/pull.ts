import { defineTask } from "nitro/task";
import { refreshNews } from "../../news/feeds";

// Scheduled in nuxt.config, also triggerable by hand via /_nitro/tasks/news:pull in dev
export default defineTask({
  meta: { name: "news:pull", description: "Fetch all news feeds into the cache" },
  async run() {
    const news = await refreshNews();
    return { result: { fetchedAt: news.fetchedAt, digest: news.digest } };
  },
});
