/**
 * Printer connection: WebSocket (port 10) and TCP (port 9100)
 *
 * WebSocket: send-only (printing), no response relay
 * TCP: bidirectional (printing + status queries)
 */

import { CMD, concat, parseStatus } from "./escpos";

export interface PrinterConfig {
  host: string;
  wsPort: number;
  tcpPort: number;
}

/**
 * Send ESC/POS data via raw TCP (preferred - reliable, bidirectional)
 * Post-send delay scales with data size to ensure printer receives everything.
 */
export async function printViaTCP(config: PrinterConfig, data: Uint8Array): Promise<void> {
  // Scale delay: 500ms base + 50ms per KB (logo bitmaps are ~15KB)
  const postSendDelay = Math.max(500, Math.min(3000, 500 + Math.ceil(data.length / 1024) * 50));

  return new Promise((resolve, reject) => {
    const target = `${config.host}:${config.tcpPort}`;
    const timeout = setTimeout(() => reject(new Error(`[printer] TCP timeout connecting to ${target} after 10s`)), 10000);

    Bun.connect({
      hostname: config.host,
      port: config.tcpPort,
      socket: {
        open(socket) {
          clearTimeout(timeout);
          socket.write(data);
          socket.flush();
          console.log(`[printer] TCP:${target} sent ${data.length} bytes, waiting ${postSendDelay}ms...`);
          setTimeout(() => {
            socket.end();
            resolve();
          }, postSendDelay);
        },
        error(_, err) {
          clearTimeout(timeout);
          reject(new Error(`[printer] TCP:${target} connection failed: ${err?.message ?? err}`));
        },
        close() {
          clearTimeout(timeout);
          resolve();
        },
        data() {},
      },
    });
  });
}

/**
 * Send ESC/POS data via WebSocket (fallback - send-only, no confirmation)
 */
export async function printViaWebSocket(config: PrinterConfig, data: Uint8Array): Promise<void> {
  const url = `ws://${config.host}:${config.wsPort}`;
  const postSendDelay = Math.max(1000, Math.min(5000, 1000 + Math.ceil(data.length / 1024) * 100));

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`WebSocket timeout connecting to ${url}`));
    }, 10000);

    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      ws.send(data);
      console.log(`[printer] WS sent ${data.length} bytes, waiting ${postSendDelay}ms...`);
      setTimeout(() => {
        ws.close();
        resolve();
      }, postSendDelay);
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket error connecting to ${url}`));
    });
  });
}

const WS_PRINT = process.env.WEBSOCKET_PRINT === "true";

/**
 * Print data. TCP by default. Set WEBSOCKET_PRINT=true to try WS first.
 */
export async function print(config: PrinterConfig, data: Uint8Array): Promise<{ method: "websocket" | "tcp" }> {
  if (WS_PRINT) {
    try {
      await printViaWebSocket(config, data);
      return { method: "websocket" };
    } catch (wsErr) {
      console.warn(`[printer] WS failed, falling back to TCP: ${wsErr}`);
    }
  }
  await printViaTCP(config, data);
  return { method: "tcp" };
}

export interface PrinterStatus {
  online: boolean;
  paper: "ok" | "low" | "out" | "unknown";
  errors: string[];
}

/**
 * Query printer status via TCP/9100 (WebSocket is send-only)
 */
export async function getStatus(config: PrinterConfig): Promise<PrinterStatus> {
  return new Promise((resolve, reject) => {
    const target = `${config.host}:${config.tcpPort}`;
    const timeout = setTimeout(() => reject(new Error(`[printer] Status query timeout - ${target} did not respond in 3s`)), 3000);

    Bun.connect({
      hostname: config.host,
      port: config.tcpPort,
      socket: {
        open(socket) {
          socket.write(concat(CMD.statusPrinter, CMD.statusError, CMD.statusPaper));
          socket.flush();
        },
        data(socket, data) {
          clearTimeout(timeout);
          const bytes = new Uint8Array(data);
          socket.end();

          const printerFlags = bytes.length > 0 ? parseStatus(bytes[0], "printer") : ["unknown"];
          const errorFlags = bytes.length > 1 ? parseStatus(bytes[1], "error") : [];
          const paperFlags = bytes.length > 2 ? parseStatus(bytes[2], "paper") : ["unknown"];

          const errors = errorFlags.filter((f) => f !== "ok");

          resolve({
            online: printerFlags.includes("online"),
            paper: paperFlags.includes("PAPER_OUT")
              ? "out"
              : paperFlags.includes("PAPER_LOW")
                ? "low"
                : paperFlags.includes("paper_ok")
                  ? "ok"
                  : "unknown",
            errors,
          });
        },
        error(_, err) {
          clearTimeout(timeout);
          reject(new Error(`[printer] Status query failed - ${target}: ${err?.message ?? err}`));
        },
        close() {
          clearTimeout(timeout);
        },
      },
    });
  });
}
