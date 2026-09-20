import { defineEventHandler } from "nuxt/server";
import { useRuntimeConfig } from "nitro/runtime-config";
import { subscribe } from "../live/bus";

// Server sent events: "something changed, reload". Keepalive comments every 25 seconds keep
// proxies from closing the connection. The hello carries the server version so long running
// tabs (kitchen tablet) can notice a release.
const KEEPALIVE_MS = 25 * 1000;

export default defineEventHandler((event) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // stream already closed
        }
      };
      send(`retry: 3000\n\n`);
      send(
        `event: hello\ndata: ${JSON.stringify({ version: useRuntimeConfig().public.version })}\n\n`,
      );
      const unsubscribe = subscribe((change) => send(`data: ${JSON.stringify(change)}\n\n`));
      const keepalive = setInterval(() => send(`: keepalive\n\n`), KEEPALIVE_MS);
      event.req.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
});
