/**
 * ESC/POS command builder for Xprinter XP-C300H
 *
 * Font A: 48 chars/line (12x24)
 * Font B: 64 chars/line (9x17)
 * Max print width: 576 pixels (72mm @ 203 DPI)
 */

const ESC = 0x1b;
const GS = 0x1d;
const DLE = 0x10;
const EOT = 0x04;

export const COLS_A = 48;
export const COLS_B = 64;

export const CMD = {
  init: bytes(ESC, 0x40),
  alignLeft: bytes(ESC, 0x61, 0x00),
  alignCenter: bytes(ESC, 0x61, 0x01),
  boldOn: bytes(ESC, 0x45, 0x01),
  boldOff: bytes(ESC, 0x45, 0x00),
  fontA: bytes(ESC, 0x4d, 0x00),
  fontB: bytes(ESC, 0x4d, 0x01),
  doubleW: bytes(GS, 0x21, 0x10),
  doubleH: bytes(GS, 0x21, 0x01),
  doubleWH: bytes(GS, 0x21, 0x11),
  normalSize: bytes(GS, 0x21, 0x00),
  invertOn: bytes(GS, 0x42, 0x01),
  invertOff: bytes(GS, 0x42, 0x00),
  cutPartial: bytes(GS, 0x56, 0x42, 0x10),
  statusPrinter: bytes(DLE, EOT, 0x01),
  statusOffline: bytes(DLE, EOT, 0x02),
  statusError: bytes(DLE, EOT, 0x03),
  statusPaper: bytes(DLE, EOT, 0x04),
} as const;

export function bytes(...vals: number[]): Uint8Array {
  return Uint8Array.from(vals);
}

export function text(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function feed(n: number): Uint8Array {
  return bytes(ESC, 0x64, n);
}

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

export function divider(char = "-"): Uint8Array {
  return concat(CMD.fontB, text(char.repeat(COLS_B) + "\n"), CMD.fontA);
}

/**
 * Build QR code ESC/POS commands (GS ( k)
 * @param data - QR code content
 * @param moduleSize - dot size (1-16, default 8)
 * @param errorCorrection - 0x30=L, 0x31=M, 0x32=Q, 0x33=H
 */
export function qrCode(data: string, moduleSize = 8, errorCorrection = 0x31): Uint8Array {
  const encoded = new TextEncoder().encode(data);
  const dataLen = encoded.length + 3;

  return concat(
    bytes(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00),        // Model 2
    bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize),         // Module size
    bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, errorCorrection),    // Error correction
    bytes(GS, 0x28, 0x6b, dataLen & 0xff, (dataLen >> 8) & 0xff, 0x31, 0x50, 0x30), // Store
    encoded,
    bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30),              // Print
  );
}

/**
 * Build GS v 0 raster bitmap command from raw 1-bit raster data
 */
export function rasterBitmap(widthBytes: number, height: number, data: Uint8Array): Uint8Array {
  const header = bytes(
    GS, 0x76, 0x30, 0x00,
    widthBytes & 0xff, (widthBytes >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
  );
  return concat(header, data);
}

/**
 * Parse DLE EOT status response byte
 */
export function parseStatus(byte: number, type: "printer" | "offline" | "error" | "paper"): string[] {
  const flags: string[] = [];

  if (type === "printer") {
    if (byte & 0x08) flags.push("DRAWER_OPEN");
    if (byte & 0x20) flags.push("OFFLINE");
    if (!(byte & 0x20)) flags.push("online");
  } else if (type === "offline") {
    if (byte & 0x04) flags.push("COVER_OPEN");
    if (byte & 0x08) flags.push("FEED_BUTTON");
    if (byte & 0x20) flags.push("PAPER_FEED_ERROR");
    if (byte & 0x40) flags.push("OTHER_ERROR");
  } else if (type === "error") {
    if (byte & 0x04) flags.push("CUTTER_ERROR");
    if (byte & 0x08) flags.push("UNRECOVERABLE");
    if (byte & 0x20) flags.push("AUTO_RECOVERY");
    if (byte & 0x40) flags.push("HEAD_OVERHEAT");
  } else if (type === "paper") {
    if (byte & 0x60) flags.push("PAPER_OUT");
    else if (byte & 0x0c) flags.push("PAPER_LOW");
    else flags.push("paper_ok");
  }

  return flags.length ? flags : ["ok"];
}
