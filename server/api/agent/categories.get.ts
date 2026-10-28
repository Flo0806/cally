import { listLookups } from "../../database/lookups";
import { defineAgentHandler } from "../../agent/handler";

// Read and assign only: the family keeps its categories few, an agent would add one per topic
export default defineAgentHandler(async () => {
  const categories = await listLookups("categories");
  return categories.map(({ id, name }) => ({ id, name }));
});
