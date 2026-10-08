// Regression (2026-10-08): printer offline -> Bun.connect() rejects its own promise with
// ECONNREFUSED (socket.error does NOT fire for connect failures). Unhandled, that killed the
// whole addon and the Supervisor watchdog gave up. Each call must reject/return, never crash.
import { expect, test } from "bun:test";
import { getStatus, printViaTCP } from "../lib/printer";
import { sendPrinterCommand } from "../lib/printer-commands";

// Port 1 on localhost: nothing listens -> immediate ECONNREFUSED
const offline = { host: "127.0.0.1", wsPort: 1, tcpPort: 1 };

test("printViaTCP rejects when printer refuses", async () => {
  await expect(printViaTCP(offline, new Uint8Array([0x1b, 0x40]))).rejects.toThrow(/127\.0\.0\.1:1/);
});

test("getStatus rejects when printer refuses", async () => {
  await expect(getStatus(offline)).rejects.toThrow(/127\.0\.0\.1:1/);
});

test("sendPrinterCommand returns ok:false when printer refuses", async () => {
  const r = await sendPrinterCommand(offline, "beep_print_off");
  expect(r.ok).toBe(false);
});
