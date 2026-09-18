import * as v from "valibot";
import { COLORS } from "./types";

export const lookupInput = v.object({
  name: v.pipe(
    v.string("Name fehlt"),
    v.trim(),
    v.minLength(1, "Name darf nicht leer sein"),
    v.maxLength(40, "Name ist zu lang (max. 40 Zeichen)"),
  ),
  color: v.picklist(COLORS, "Unbekannte Farbe"),
  position: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

export const lookupPatch = v.partial(lookupInput);

export type LookupInput = v.InferOutput<typeof lookupInput>;
export type LookupPatch = v.InferOutput<typeof lookupPatch>;
