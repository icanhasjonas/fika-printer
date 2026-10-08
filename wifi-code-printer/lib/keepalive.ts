/**
 * Printer keep-alive.
 *
 * The Fika printer (2026-10-08) does not answer broadcast ARP, only unicast. Once the host's
 * neighbor entry for it expires, nothing can find it again. Touching it every N seconds keeps
 * the entry fresh: Linux re-validates a known neighbor with UNICAST probes, which it does answer.
 * Only state transitions are logged, so a dead printer doesn't spam the log.
 */

export interface KeepaliveHandle {
  stop(): void;
  /** Run one check now (also used by tests). */
  tick(): Promise<boolean>;
}

export function startPrinterKeepalive(
  check: () => Promise<{ online: boolean }>,
  intervalMs: number,
  log: (msg: string) => void = (m) => console.log(m),
): KeepaliveHandle {
  let last: boolean | null = null;

  async function tick(): Promise<boolean> {
    let online = false;
    let detail = "";
    try {
      online = (await check()).online;
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    if (online !== last) {
      log(online ? "[keepalive] printer ONLINE" : `[keepalive] printer OFFLINE${detail ? `: ${detail}` : ""}`);
      last = online;
    }
    return online;
  }

  const timer = setInterval(() => void tick(), intervalMs);
  void tick();
  return { stop: () => clearInterval(timer), tick };
}
