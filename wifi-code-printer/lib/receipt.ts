/**
 * FIKA WiFi receipt builder
 *
 * Builds ESC/POS binary data for a WiFi voucher receipt.
 * Logo is pre-converted to raster bitmap (see build-logo.ts).
 */

import { CMD, COLS_B, concat, divider, feed, qrCode, rasterBitmap, text } from "./escpos";

export interface ReceiptData {
  ssid: string;
  code: string;
  durationMinutes: number;
  devices: number;
  validUntil?: string;  // "19:00" - if set, shows "Valid until 19:00" instead of duration
}

interface LogoBitmap {
  widthBytes: number;
  height: number;
  data: Uint8Array;
}

let cachedLogo: LogoBitmap | null = null;

/**
 * Load pre-converted logo bitmap from disk
 */
async function loadLogo(): Promise<LogoBitmap | null> {
  if (cachedLogo) return cachedLogo;

  try {
    const file = Bun.file(new URL("../assets/logo.bin", import.meta.url).pathname);
    if (!(await file.exists())) return null;

    const buf = new Uint8Array(await file.arrayBuffer());
    const widthBytes = buf[0] | (buf[1] << 8);
    const height = buf[2] | (buf[3] << 8);
    const data = buf.slice(4);

    cachedLogo = { widthBytes, height, data };
    return cachedLogo;
  } catch {
    return null;
  }
}

/**
 * Format duration in human-friendly units
 * 30 -> "30 min"
 * 60 -> "1 hour"
 * 120 -> "2 hours"
 * 1440 -> "1 day"
 * 43200 -> "30 days"
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = Math.round(minutes / 60);
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  const d = Math.round(minutes / 1440);
  return d === 1 ? "1 day" : `${d} days`;
}

const ONE_LINERS = [
  "Coffee first, WiFi second. Priorities.",
  "Decaf is just bean-flavored disappointment.",
  "This WiFi runs on caffeine and good vibes.",
  "Life begins after coffee. And WiFi.",
  "Espresso yourself. We won't judge.",
  "Behind every great person is a great cup of coffee.",
  "Today's forecast: 100% chance of coffee.",
  "Coffee: because adulting is hard.",
  "May your coffee be strong and your WiFi stronger.",
  "No talkie before coffee.",
  "Coffee is a hug in a mug.",
  "But first, coffee. Then WiFi. Then world domination.",
  "I like my coffee like I like my mornings: dark.",
  "A yawn is a silent scream for coffee.",
  "Coffee doesn't ask silly questions. Coffee understands.",
  "This code will self-destruct after your last sip.",
  "Powered by coffee beans and tropical breezes.",
  "WiFi password? That's above my pay grade. Use the code.",
  "You had me at 'free WiFi'.",
  "Coffee: the gasoline of the human engine.",
  "Procaffeinating: the tendency to not start anything until coffee.",
  "Instant human, just add coffee.",
  "Stay grounded, drink coffee, use WiFi.",
  "Warning: WiFi may cause extended cafe visits.",
  "Life is too short for bad coffee and slow WiFi.",
];

function randomOneLiner(): string {
  return ONE_LINERS[Math.floor(Math.random() * ONE_LINERS.length)];
}

/**
 * Build a complete WiFi voucher receipt
 */
export async function buildReceipt(receipt: ReceiptData): Promise<Uint8Array> {
  const wifiQR = `WIFI:T:nopass;S:${receipt.ssid};;`;
  const logo = await loadLogo();
  const now = new Date();
  const timestamp = now.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts: Uint8Array[] = [
    CMD.init,
    CMD.alignCenter,
    feed(2),
  ];

  // === LOGO ===
  if (logo) {
    parts.push(rasterBitmap(logo.widthBytes, logo.height, logo.data));
    parts.push(feed(1));
  } else {
    parts.push(CMD.fontA, CMD.boldOn, CMD.invertOn);
    parts.push(text("  " + " ".repeat(14) + "F I K A" + " ".repeat(15) + "  \n"));
    parts.push(text("  " + " ".repeat(10) + "COFFEE & COWORK" + " ".repeat(11) + "  \n"));
    parts.push(CMD.invertOff, CMD.boldOff);
    parts.push(feed(1));
  }

  // === FREE WIFI header ===
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleH);
  parts.push(text("~ FREE WIFI ~\n"));
  parts.push(CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // === QR code section ===
  parts.push(divider());
  parts.push(CMD.fontB, text("Scan to connect\n"), CMD.fontA);
  parts.push(feed(1));
  parts.push(CMD.alignCenter);
  parts.push(qrCode(wifiQR, 8, 0x31));
  parts.push(feed(1));

  // === Network name ===
  parts.push(divider());
  parts.push(feed(1));
  parts.push(CMD.fontB, text("Network\n"));
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleWH);
  parts.push(text(receipt.ssid + "\n"));
  parts.push(CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // === VOUCHER CODE (BIG) ===
  parts.push(CMD.fontB, text("Enter this code when prompted\n"));
  parts.push(feed(1));
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleWH);
  parts.push(text(receipt.code + "\n"));
  parts.push(CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // === Duration + validity ===
  parts.push(divider());
  parts.push(CMD.fontB);
  const deviceStr = receipt.devices === 1 ? "1 device" : `${receipt.devices} devices`;
  parts.push(text(`${formatDuration(receipt.durationMinutes)} - ${deviceStr}\n`));
  if (receipt.validUntil) {
    parts.push(text(`Must be activated before ${receipt.validUntil}\n`));
  }
  parts.push(CMD.fontA);
  parts.push(feed(1));

  // === One-liner ===
  parts.push(CMD.fontB, text(randomOneLiner() + "\n"), CMD.fontA);
  parts.push(feed(2));

  // === Timestamp (small) ===
  parts.push(CMD.fontB);
  parts.push(text(timestamp + "\n"));
  parts.push(CMD.fontA);
  parts.push(feed(3));

  // === Cut ===
  parts.push(CMD.cutPartial);

  return concat(...parts);
}

/**
 * Build a custom message receipt
 */
export interface MessageData {
  subject: string;
  message?: string;
  footer?: string;
  includeLogo?: boolean;
}

export async function buildMessageReceipt(msg: MessageData): Promise<Uint8Array> {
  const logo = msg.includeLogo ? await loadLogo() : null;
  const now = new Date();
  const timestamp = now.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const parts: Uint8Array[] = [
    CMD.init,
    CMD.alignCenter,
    feed(2),
  ];

  // === LOGO ===
  if (logo) {
    parts.push(rasterBitmap(logo.widthBytes, logo.height, logo.data));
    parts.push(feed(1));
  }

  // === SUBJECT (BIG) ===
  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleWH);
  parts.push(text(msg.subject + "\n"));
  parts.push(CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  // === MESSAGE ===
  if (msg.message) {
    parts.push(divider());
    parts.push(feed(1));
    parts.push(CMD.fontB);
    for (const line of msg.message.split("\n")) {
      parts.push(text(line + "\n"));
    }
    parts.push(CMD.fontA);
    parts.push(feed(1));
  }

  // === FOOTER (BIG) ===
  if (msg.footer) {
    parts.push(divider());
    parts.push(feed(1));
    parts.push(CMD.fontA, CMD.boldOn, CMD.doubleWH);
    parts.push(text(msg.footer + "\n"));
    parts.push(CMD.normalSize, CMD.boldOff);
    parts.push(feed(1));
  }

  // === Timestamp ===
  parts.push(CMD.fontB);
  parts.push(text(timestamp + "\n"));
  parts.push(CMD.fontA);
  parts.push(feed(3));
  parts.push(CMD.cutPartial);

  return concat(...parts);
}

/**
 * Build a simple test receipt (no voucher needed)
 */
export async function buildTestReceipt(): Promise<Uint8Array> {
  const logo = await loadLogo();

  const parts: Uint8Array[] = [
    CMD.init,
    CMD.alignCenter,
    feed(2),
  ];

  if (logo) {
    parts.push(rasterBitmap(logo.widthBytes, logo.height, logo.data));
    parts.push(feed(1));
  }

  parts.push(CMD.fontA, CMD.boldOn, CMD.doubleH);
  parts.push(text("PRINTER TEST\n"));
  parts.push(CMD.normalSize, CMD.boldOff);
  parts.push(feed(1));

  parts.push(divider());
  parts.push(CMD.fontB);
  parts.push(text(`Time: ${new Date().toLocaleString()}\n`));
  parts.push(text("If you can read this, printing works!\n"));
  parts.push(CMD.fontA);
  parts.push(feed(4));
  parts.push(CMD.cutPartial);

  return concat(...parts);
}
