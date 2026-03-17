#!/usr/bin/env bun
/**
 * FIKA WiFi Receipt Printer
 *
 * Usage:
 *   bun print-receipt.ts                          # Print test receipt with dummy code
 *   bun print-receipt.ts --code 83291-47502       # Print with specific code
 *   bun print-receipt.ts --duration 30m           # 30 minutes validity
 *   bun print-receipt.ts --duration 1h            # 1 hour
 *   bun print-receipt.ts --duration 30d           # 30 days
 *   bun print-receipt.ts --devices 3              # 3 devices allowed
 *   bun print-receipt.ts --ssid "fika"            # Custom SSID
 *   bun print-receipt.ts --logo path/to/logo.png  # Use custom logo
 *   bun print-receipt.ts --no-logo                # Skip logo
 *   bun print-receipt.ts --tcp                    # Force TCP instead of WebSocket
 */

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  init: b(ESC, 0x40),
  alignCenter: b(ESC, 0x61, 0x01),
  boldOn: b(ESC, 0x45, 0x01),
  boldOff: b(ESC, 0x45, 0x00),
  fontA: b(ESC, 0x4d, 0x00),
  fontB: b(ESC, 0x4d, 0x01),
  doubleH: b(GS, 0x21, 0x01),
  doubleWH: b(GS, 0x21, 0x11),
  normalSize: b(GS, 0x21, 0x00),
  invertOn: b(GS, 0x42, 0x01),
  invertOff: b(GS, 0x42, 0x00),
  cutPartial: b(GS, 0x56, 0x42, 0x10),
};

function b(...vals: number[]): Uint8Array {
  return Uint8Array.from(vals);
}

function txt(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function feed(n: number): Uint8Array {
  return b(ESC, 0x64, n);
}

function divider(): Uint8Array {
  return cat(CMD.fontB, txt("-".repeat(64) + "\n"), CMD.fontA);
}

function cat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function qrCode(data: string, moduleSize = 8): Uint8Array {
  const encoded = new TextEncoder().encode(data);
  const dataLen = encoded.length + 3;
  return cat(
    b(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00),
    b(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize),
    b(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31),
    b(GS, 0x28, 0x6b, dataLen & 0xff, (dataLen >> 8) & 0xff, 0x31, 0x50, 0x30),
    encoded,
    b(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30),
  );
}

function parseDuration(s: string): number {
  const match = s.match(/^(\d+)\s*(m|min|h|hr|hours?|d|days?)$/i);
  if (!match) {
    const num = Number(s);
    if (!isNaN(num)) return num; // assume minutes
    throw new Error(`Invalid duration: ${s}. Use 30m, 1h, 30d, or minutes.`);
  }
  const [, val, unit] = match;
  const n = Number(val);
  if (unit.startsWith("d")) return n * 1440;
  if (unit.startsWith("h")) return n * 60;
  return n;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = Math.round(minutes / 60);
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  const d = Math.round(minutes / 1440);
  return d === 1 ? "1 day" : `${d} days`;
}

async function convertLogo(inputPath: string, width = 384): Promise<Uint8Array> {
  const tmpPbm = "/tmp/fika-logo-print.pbm";
  const proc = Bun.spawnSync([
    "magick", inputPath,
    "-background", "white", "-flatten",
    "-resize", `${width}x`,
    "-colorspace", "Gray", "-threshold", "50%",
    "-depth", "1", tmpPbm,
  ]);

  if (proc.exitCode !== 0) {
    throw new Error(`magick failed: ${proc.stderr.toString()}`);
  }

  const data = new Uint8Array(await Bun.file(tmpPbm).arrayBuffer());

  // Parse P4 PBM
  let offset = 0;
  function readLine(): string {
    let line = "";
    while (offset < data.length) {
      const ch = String.fromCharCode(data[offset++]);
      if (ch === "\n") break;
      line += ch;
    }
    return line;
  }

  const magic = readLine();
  if (magic !== "P4") throw new Error(`Bad PBM magic: ${magic}`);

  let dims = readLine();
  while (dims.startsWith("#")) dims = readLine();

  const [w, h] = dims.split(" ").map(Number);
  const wb = Math.ceil(w / 8);
  const raster = data.slice(offset);

  // GS v 0 raster bitmap
  const header = b(GS, 0x76, 0x30, 0x00, wb & 0xff, (wb >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff);
  return cat(header, raster);
}

async function buildReceipt(opts: {
  ssid: string;
  code: string;
  durationMinutes: number;
  devices: number;
  logoPath?: string;
  noLogo?: boolean;
}): Promise<Uint8Array> {
  const wifiQR = `WIFI:T:WPA;S:${opts.ssid};P:${opts.code};;`;
  const now = new Date();
  const timestamp = now.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const parts: Uint8Array[] = [CMD.init, CMD.alignCenter, feed(2)];

  // Logo
  if (!opts.noLogo && opts.logoPath) {
    try {
      parts.push(await convertLogo(opts.logoPath));
      parts.push(feed(1));
    } catch (err) {
      console.warn(`Logo failed: ${err}`);
    }
  } else if (!opts.noLogo) {
    // Try default location
    const defaults = [
      new URL("./assets/fika-logo.png", import.meta.url).pathname,
      "/tmp/fika-logo.png",
    ];
    for (const p of defaults) {
      try {
        if (await Bun.file(p).exists()) {
          parts.push(await convertLogo(p));
          parts.push(feed(1));
          break;
        }
      } catch {}
    }
  }

  // FREE WIFI
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleH, txt("~ FREE WIFI ~\n"), CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // QR
  parts.push(divider());
  parts.push(CMD.fontB, txt("Scan to connect\n"), CMD.fontA);
  parts.push(feed(1));
  parts.push(CMD.alignCenter, qrCode(wifiQR, 8));
  parts.push(feed(1));

  // Network
  parts.push(divider(), feed(1));
  parts.push(CMD.fontB, txt("Network\n"));
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleWH, txt(opts.ssid + "\n"), CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // CODE (BIG)
  parts.push(CMD.fontB, txt("Enter this code when prompted\n"));
  parts.push(feed(1));
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleWH, txt(opts.code + "\n"), CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // Duration + devices
  parts.push(divider());
  parts.push(CMD.fontB);
  const devStr = opts.devices === 1 ? "1 device" : `${opts.devices} devices`;
  parts.push(txt(`Valid for ${formatDuration(opts.durationMinutes)} - ${devStr}\n`));
  parts.push(CMD.fontA, feed(1));

  // Footer
  parts.push(CMD.fontB, txt("Enjoy your coffee!\n"), CMD.fontA);
  parts.push(feed(2));

  // Timestamp
  parts.push(CMD.fontB, txt(timestamp + "\n"), CMD.fontA);
  parts.push(feed(3));

  parts.push(CMD.cutPartial);
  return cat(...parts);
}

async function sendWebSocket(host: string, port: number, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${host}:${port}`);
    ws.binaryType = "arraybuffer";
    const timeout = setTimeout(() => { ws.close(); reject(new Error("WS timeout")); }, 10000);
    ws.addEventListener("open", () => {
      ws.send(data);
      clearTimeout(timeout);
      setTimeout(() => { ws.close(); resolve(); }, 2000);
    });
    ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("WS error")); });
  });
}

async function sendTCP(host: string, port: number, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("TCP timeout")), 10000);
    Bun.connect({
      hostname: host,
      port,
      socket: {
        open(socket) {
          clearTimeout(timeout);
          socket.write(data);
          socket.flush();
          setTimeout(() => { socket.end(); resolve(); }, 2000);
        },
        error(_, err) { clearTimeout(timeout); reject(err); },
        close() { clearTimeout(timeout); resolve(); },
        data() {},
      },
    });
  });
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`FIKA WiFi Receipt Printer

Usage:
  bun print-receipt.ts [options]

Options:
  --code <code>       Voucher code (default: random test code)
  --ssid <name>       WiFi network name (default: fika)
  --duration <dur>    Validity: 30m, 1h, 2h, 30d (default: 1h)
  --devices <n>       Devices per code (default: 1)
  --logo <path>       Logo PNG path (default: auto-detect)
  --no-logo           Skip logo
  --host <host>       Printer host (default: fika-printer)
  --tcp               Force TCP/9100 instead of WebSocket
  --save <path>       Save binary to file instead of printing`);
  process.exit(0);
}

function arg(flag: string, fallback = ""): string {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}

const code = arg("--code") || `${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;
const ssid = arg("--ssid", "fika");
const durationMinutes = parseDuration(arg("--duration", "1h"));
const devices = Number(arg("--devices", "1"));
const host = arg("--host", "fika-printer");
const logoPath = arg("--logo") || undefined;
const noLogo = args.includes("--no-logo");
const forceTcp = args.includes("--tcp");
const savePath = arg("--save") || undefined;

console.log(`FIKA WiFi Receipt`);
console.log(`  SSID:     ${ssid}`);
console.log(`  Code:     ${code}`);
console.log(`  Duration: ${formatDuration(durationMinutes)}`);
console.log(`  Devices:  ${devices}`);
console.log(`  Host:     ${host}`);
console.log();

const receipt = await buildReceipt({ ssid, code, durationMinutes, devices, logoPath, noLogo });
console.log(`Receipt: ${receipt.length} bytes`);

if (savePath) {
  await Bun.write(savePath, receipt);
  console.log(`Saved to ${savePath}`);
  process.exit(0);
}

// Send to printer
try {
  if (forceTcp) {
    console.log("Sending via TCP/9100...");
    await sendTCP(host, 9100, receipt);
  } else {
    console.log("Sending via WebSocket:10...");
    await sendWebSocket(host, 10, receipt);
  }
  console.log("Done!");
} catch (err) {
  if (!forceTcp) {
    console.warn(`WebSocket failed (${err}), trying TCP/9100...`);
    await sendTCP(host, 9100, receipt);
    console.log("Done (via TCP fallback)!");
  } else {
    throw err;
  }
}
