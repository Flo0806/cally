import { defineEventHandler } from "nuxt/server";
import * as v from "valibot";
import type { Place } from "#shared/types";
import { searchPlaces } from "../../geo/photon";
import { homeCoords } from "../../geo/home";
import { getValidatedQuery } from "../../utils/validate";

const query = v.object({ q: v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(200)) });

export default defineEventHandler(async (event): Promise<Place[]> => {
  const { q } = getValidatedQuery(event, query);
  try {
    return await searchPlaces(q, homeCoords());
  } catch (error) {
    console.warn(`[geo] search failed: ${String(error)}`);
    return [];
  }
});
