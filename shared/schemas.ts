import * as v from "valibot";
import { COLORS } from "./types";
import { isDateString, isDateTimeString } from "./dates";
import { isValidRrule } from "./occurrences";

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

export const dateString = v.pipe(
  v.string("Datum fehlt"),
  v.check(isDateString, "Ungültiges Datum"),
);

const id = v.pipe(v.string(), v.minLength(1));

export const eventInput = v.pipe(
  v.object({
    title: v.pipe(
      v.string("Titel fehlt"),
      v.trim(),
      v.minLength(1, "Titel darf nicht leer sein"),
      v.maxLength(120, "Titel ist zu lang (max. 120 Zeichen)"),
    ),
    notes: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000, "Notizen sind zu lang")), ""),
    allDay: v.boolean("Ganztägig fehlt"),
    start: v.string("Beginn fehlt"),
    end: v.string("Ende fehlt"),
    rrule: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(200))), null),
    exdates: v.optional(v.array(v.string()), []),
    categoryId: v.optional(v.nullable(id), null),
    memberIds: v.optional(v.array(id), []),
  }),
  v.forward(
    v.check(
      ({ allDay, start }) => (allDay ? isDateString(start) : isDateTimeString(start)),
      "Ungültiger Beginn",
    ),
    ["start"],
  ),
  v.forward(
    v.check(
      ({ allDay, end }) => (allDay ? isDateString(end) : isDateTimeString(end)),
      "Ungültiges Ende",
    ),
    ["end"],
  ),
  v.forward(
    v.check(({ start, end }) => end >= start, "Ende liegt vor dem Beginn"),
    ["end"],
  ),
  v.forward(
    v.check(
      ({ rrule }) => rrule === null || rrule === "" || isValidRrule(rrule),
      "Ungültige Wiederholung",
    ),
    ["rrule"],
  ),
  v.transform((input) => ({ ...input, rrule: input.rrule || null })),
);

export type EventInput = v.InferOutput<typeof eventInput>;

export const rangeQuery = v.pipe(
  v.object({ from: dateString, to: dateString }),
  v.forward(
    v.check(({ from, to }) => to >= from, "Bis liegt vor Von"),
    ["to"],
  ),
);

export const todoInput = v.object({
  title: v.pipe(
    v.string("Text fehlt"),
    v.trim(),
    v.minLength(1, "Text darf nicht leer sein"),
    v.maxLength(200, "Text ist zu lang (max. 200 Zeichen)"),
  ),
  memberId: v.optional(v.nullable(id), null),
});

export const todoPatch = v.partial(
  v.object({
    title: todoInput.entries.title,
    memberId: v.nullable(id),
    done: v.boolean(),
    position: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
);

export type TodoInput = v.InferOutput<typeof todoInput>;
export type TodoPatch = v.InferOutput<typeof todoPatch>;

export const heartInput = v.object({
  memberId: id,
  categoryId: v.pipe(v.string(), v.minLength(1)),
});

export type HeartInput = v.InferOutput<typeof heartInput>;
