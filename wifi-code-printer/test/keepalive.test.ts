import { expect, test } from "bun:test";
import { startPrinterKeepalive } from "../lib/keepalive";

test("keepalive logs only transitions and never throws on a failing check", async () => {
  const states = [true, true, false, false, true];
  let i = 0;
  const logs: string[] = [];
  const ka = startPrinterKeepalive(
    async () => {
      const s = states[Math.min(i++, states.length - 1)];
      if (!s) throw new Error("ECONNREFUSED");
      return { online: true };
    },
    1_000_000, // interval never fires during the test; drive it via tick()
    (m) => logs.push(m),
  );
  await Bun.sleep(5); // initial tick
  for (let n = 0; n < 4; n++) await ka.tick();
  ka.stop();
  expect(logs).toEqual([
    "[keepalive] printer ONLINE",
    "[keepalive] printer OFFLINE: ECONNREFUSED",
    "[keepalive] printer ONLINE",
  ]);
});
