import { defineEventHandler } from "nuxt/server";
import type { NewsStatus } from "#shared/types";
import { getNews, getNewsStatus } from "../../news/feeds";

// Tiny poll target for the news page: has the content changed since it loaded?
export default defineEventHandler(async (): Promise<NewsStatus> => {
  const status = getNewsStatus();
  if (status) return status;
  const { fetchedAt, digest } = await getNews();
  return { fetchedAt, digest };
});
