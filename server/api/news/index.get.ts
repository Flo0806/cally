import { defineEventHandler } from "nuxt/server";
import { getNews } from "../../news/feeds";

export default defineEventHandler(() => getNews());
