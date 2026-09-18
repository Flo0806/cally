import type { Color, Occurrence } from "#shared/types";
import { useLookups } from "~/composables/useLookups";

// One member: their color. Otherwise the category. Otherwise the accent, which is `null` here.
export function useEventColor() {
  const members = useLookups("members").items;
  const categories = useLookups("categories").items;

  return (occurrence: Pick<Occurrence, "memberIds" | "categoryId">): Color | null => {
    if (occurrence.memberIds.length === 1) {
      const member = members.value.find((m) => m.id === occurrence.memberIds[0]);
      if (member) return member.color;
    }
    if (occurrence.categoryId) {
      const category = categories.value.find((c) => c.id === occurrence.categoryId);
      if (category) return category.color;
    }
    return null;
  };
}
