#!/usr/bin/env bun
/**
 * FIKA Printer WebSocket Tool
 *
 * Print ESC/POS commands and monitor printer status via WebSocket.
 * The HF-LPT230 WiFi module exposes a WebSocket-to-serial bridge on port 10.
 *
 * Usage:
 *   bun ws-print.ts                  # Print test receipt
 *   bun ws-print.ts --status         # Query printer status
 *   bun ws-print.ts --monitor        # Continuous status monitoring
 *   bun ws-print.ts --text "Hello!"  # Print simple text
 */

const PRINTER_HOST = process.env.PRINTER_HOST ?? "fika-printer";
const PRINTER_WS_PORT = Number(process.env.PRINTER_WS_PORT ?? 10);
const WS_URL = `ws://${PRINTER_HOST}:${PRINTER_WS_PORT}`;

// ESC/POS commands
const ESC = 0x1b;
const GS = 0x1d;
const DLE = 0x10;
const EOT = 0x04;

const CMD = {
  init: Uint8Array.from([ESC, 0x40]),
  alignCenter: Uint8Array.from([ESC, 0x61, 0x01]),
  alignLeft: Uint8Array.from([ESC, 0x61, 0x00]),
  boldOn: Uint8Array.from([ESC, 0x45, 0x01]),
  boldOff: Uint8Array.from([ESC, 0x45, 0x00]),
  fontA: Uint8Array.from([ESC, 0x4d, 0x00]),
  fontB: Uint8Array.from([ESC, 0x4d, 0x01]),
  doubleWH: Uint8Array.from([GS, 0x21, 0x11]),
  doubleH: Uint8Array.from([GS, 0x21, 0x01]),
  normalSize: Uint8Array.from([GS, 0x21, 0x00]),
  feed: (n: number) => Uint8Array.from([ESC, 0x64, n]),
  cut: Uint8Array.from([GS, 0x56, 0x42, 0x10]),

  // DLE EOT status queries
  statusPrinter: Uint8Array.from([DLE, EOT, 0x01]),   // General status
  statusOffline: Uint8Array.from([DLE, EOT, 0x02]),   // Offline cause
  statusError: Uint8Array.from([DLE, EOT, 0x03]),     // Error status
  statusPaper: Uint8Array.from([DLE, EOT, 0x04]),     // Paper sensor
};

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function parseStatusByte(byte: number, type: string): string[] {
  const flags: string[] = [];

  if (type === "printer") {
    if (byte & 0x08) flags.push("DRAWER OPEN");
    if (byte & 0x20) flags.push("OFFLINE");
    if (byte === 0x12 || (byte & ~0x28) === 0x12) flags.push("online");
  } else if (type === "offline") {
    if (byte & 0x04) flags.push("COVER OPEN");
    if (byte & 0x08) flags.push("FEED BUTTON PRESSED");
    if (byte & 0x20) flags.push("PAPER FEED ERROR");
    if (byte & 0x40) flags.push("OTHER ERROR");
  } else if (type === "error") {
    if (byte & 0x04) flags.push("CUTTER ERROR");
    if (byte & 0x08) flags.push("UNRECOVERABLE ERROR");
    if (byte & 0x20) flags.push("AUTO-RECOVERY ERROR");
    if (byte & 0x40) flags.push("HEAD OVERHEAT");
  } else if (type === "paper") {
    if (byte & 0x0c) flags.push("PAPER LOW");
    if (byte & 0x60) flags.push("PAPER OUT!");
    if (!(byte & 0x60) && !(byte & 0x0c)) flags.push("paper ok");
  }

  return flags.length ? flags : ["ok"];
}

function buildTestReceipt(): Uint8Array {
  const parts = [
    CMD.init,
    CMD.alignCenter,
    CMD.feed(1),
    CMD.boldOn, CMD.doubleH,
    textBytes("WEBSOCKET PRINT TEST\n"),
    CMD.normalSize, CMD.boldOff,
    CMD.feed(1),
    CMD.fontB,
    textBytes("-".repeat(64) + "\n"),
    textBytes(`Printed via WebSocket on port ${PRINTER_WS_PORT}\n`),
    textBytes(`Host: ${WS_URL}\n`),
    textBytes(`Time: ${new Date().toLocaleString()}\n`),
    textBytes("-".repeat(64) + "\n"),
    CMD.fontA,
    CMD.feed(1),
    CMD.alignLeft,
    textBytes("If you can read this, the WebSocket-to-serial\n"),
    textBytes("bridge is working! ESC/POS commands flow from\n"),
    textBytes("browser JS -> WebSocket -> HF-LPT230 UART ->\n"),
    textBytes("printer engine. No TCP/9100 needed.\n"),
    CMD.feed(1),
    CMD.alignCenter,
    CMD.fontB,
    textBytes("~ powered by bun ~\n"),
    CMD.fontA,
    CMD.feed(4),
    CMD.cut,
  ];
  return concat(...parts);
}

async function connectAndSend(data: Uint8Array, expectResponse = false): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    let responseData: number[] = [];
    let responseTimeout: Timer | null = null;

    ws.addEventListener("open", () => {
      console.log(`Connected to ${WS_URL}`);
      ws.send(data);
      console.log(`Sent ${data.length} bytes`);

      if (!expectResponse) {
        // Give printer a moment to process, then close
        setTimeout(() => {
          ws.close();
          resolve(null);
        }, 500);
      } else {
        // Wait for response bytes
        responseTimeout = setTimeout(() => {
          ws.close();
          resolve(new Uint8Array(responseData));
        }, 2000);
      }
    });

    ws.addEventListener("message", (event) => {
      const bytes = new Uint8Array(event.data as ArrayBuffer);
      responseData.push(...bytes);

      if (responseTimeout) {
        clearTimeout(responseTimeout);
        responseTimeout = setTimeout(() => {
          ws.close();
          resolve(new Uint8Array(responseData));
        }, 500);
      }
    });

    ws.addEventListener("error", (event) => {
      reject(new Error(`WebSocket error: ${event}`));
    });

    ws.addEventListener("close", () => {
      if (responseTimeout) clearTimeout(responseTimeout);
    });
  });
}

async function queryStatus(): Promise<void> {
  // Status queries require TCP/9100 -- WebSocket bridge is send-only (no response relay)
  console.log("Querying printer status via TCP/9100...\n");

  const queries = [
    { name: "Printer", cmd: CMD.statusPrinter, type: "printer" },
    { name: "Offline", cmd: CMD.statusOffline, type: "offline" },
    { name: "Error", cmd: CMD.statusError, type: "error" },
    { name: "Paper", cmd: CMD.statusPaper, type: "paper" },
  ];

  const socket = await Bun.connect({
    hostname: PRINTER_HOST,
    port: 9100,
    socket: {
      data(socket, data) {
        const bytes = new Uint8Array(data);
        console.log(`Received ${bytes.length} bytes: [${Array.from(bytes).map((b) => "0x" + b.toString(16).padStart(2, "0")).join(", ")}]\n`);
        for (let i = 0; i < bytes.length && i < queries.length; i++) {
          const q = queries[i];
          const flags = parseStatusByte(bytes[i], q.type);
          const icon = flags.some((f) => f === f.toUpperCase() && f !== "ok") ? "!" : "ok";
          console.log(`  ${q.name.padEnd(10)} [${icon}] ${flags.join(", ")}`);
        }
        socket.end();
      },
      open(socket) {
        console.log("Connected to TCP/9100");
        const allCmds = concat(...queries.map((q) => q.cmd));
        socket.write(allCmds);
        socket.flush();
      },
      close() {
        console.log("\nDone.");
      },
      error(socket, err) {
        console.error("TCP error:", err.message);
      },
    },
  });

  // Timeout after 3 seconds
  setTimeout(() => {
    try { socket.end(); } catch {}
    console.log("(timeout)");
  }, 3000);

  // Keep process alive briefly
  await Bun.sleep(3500);
}

async function monitor(): Promise<void> {
  // Monitor via TCP/9100 (WebSocket is send-only)
  console.log(`Monitoring printer at ${PRINTER_HOST}:9100 via TCP (Ctrl+C to stop)\n`);

  const queries = [
    { name: "Paper", type: "paper" },
    { name: "Error", type: "error" },
  ];

  async function poll() {
    return new Promise<void>((resolve) => {
      Bun.connect({
        hostname: PRINTER_HOST,
        port: 9100,
        socket: {
          data(socket, data) {
            const bytes = new Uint8Array(data);
            const timestamp = new Date().toLocaleTimeString();
            const parts: string[] = [];
            for (let i = 0; i < bytes.length && i < queries.length; i++) {
              const flags = parseStatusByte(bytes[i], queries[i].type);
              parts.push(`${queries[i].name}: ${flags.join(", ")}`);
            }
            console.log(`[${timestamp}] ${parts.join("  |  ")}`);
            socket.end();
          },
          open(socket) {
            socket.write(concat(CMD.statusPaper, CMD.statusError));
            socket.flush();
            setTimeout(() => { try { socket.end(); } catch {} resolve(); }, 1500);
          },
          close() { resolve(); },
          error(_, err) { console.error(`  error: ${err.message}`); resolve(); },
        },
      });
    });
  }

  while (true) {
    await poll();
    await Bun.sleep(3000);
  }
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`FIKA Printer WebSocket Tool

Usage:
  bun ws-print.ts                  Print test receipt via WebSocket
  bun ws-print.ts --status         Query printer status
  bun ws-print.ts --monitor        Continuous status monitoring
  bun ws-print.ts --text "Hello"   Print simple text line

Environment:
  PRINTER_HOST     Printer hostname (default: fika-printer)
  PRINTER_WS_PORT  WebSocket port (default: 10)

The WebSocket bridge (port 10) on the HF-LPT230 WiFi module relays
ESC/POS data to the printer. Printing works over WebSocket, but status
queries require TCP/9100 (WebSocket bridge is send-only, no response).`);
  process.exit(0);
}

if (args.includes("--status")) {
  await queryStatus();
} else if (args.includes("--monitor")) {
  await monitor();
} else if (args.includes("--text")) {
  const idx = args.indexOf("--text");
  const msg = args[idx + 1] ?? "Hello from WebSocket!";
  const receipt = concat(
    CMD.init,
    CMD.alignCenter,
    CMD.feed(1),
    textBytes(msg + "\n"),
    CMD.feed(4),
    CMD.cut,
  );
  await connectAndSend(receipt);
  console.log("Done!");
} else {
  // Default: print test receipt
  const receipt = buildTestReceipt();
  await connectAndSend(receipt);
  console.log("Done!");
}
