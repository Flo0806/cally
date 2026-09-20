import { defineTask } from "nitro/task";
import { useRuntimeConfig } from "nitro/runtime-config";
import { pushDueReminders } from "../../today/reminders";

// Every 5 minutes (nuxt.config). Off unless NUXT_REMINDERS=1, so a dev server never pages anyone.
export default defineTask({
  meta: { name: "reminders:push", description: "Push phone reminders for today's events" },
  async run(): Promise<{ result: { skipped: boolean; sent: number; checked: number } }> {
    if (useRuntimeConfig().reminders !== "1")
      return { result: { skipped: true, sent: 0, checked: 0 } };
    const result = await pushDueReminders();
    if (result.sent) console.info(`[reminders] sent ${result.sent}`);
    return { result: { skipped: false, ...result } };
  },
});
