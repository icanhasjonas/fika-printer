#!/usr/bin/env bun
/**
 * Pre-convert FIKA logo PNG to ESC/POS raster binary.
 *
 * Requires ImageMagick (magick) for reliable PNG->1bit conversion.
 * Outputs: assets/logo.bin (4-byte header + raw raster)
 *
 * Header: [widthBytes_LE16] [height_LE16] [raster_data...]
 *
 * Run: bun build-logo.ts [input.png] [width]
 */

import { existsSync, mkdirSync } from "fs";

const inputPath = process.argv[2] ?? "assets/fika-logo.png";
const targetWidth = Number(process.argv[3] ?? 384);
const outputPath = "assets/logo.bin";

if (!existsSync(inputPath)) {
  console.log(`No logo at ${inputPath}, skipping.`);
  process.exit(0);
}

mkdirSync("assets", { recursive: true });

// Use ImageMagick to convert to clean 1-bit PGM (portable graymap)
// This handles transparency, scaling, and thresholding reliably
const tmpPbm = "/tmp/fika-logo-build.pbm";

const magick = Bun.spawnSync([
  "magick",
  inputPath,
  "-background", "white",
  "-flatten",
  "-resize", `${targetWidth}x`,
  "-colorspace", "Gray",
  "-threshold", "50%",
  "-depth", "1",
  tmpPbm,
]);

if (magick.exitCode !== 0) {
  console.error("magick failed:", magick.stderr.toString());
  // Try without magick (fallback for Docker where magick may not exist)
  console.log("Attempting Bun-only conversion...");
  // For Docker builds, we'll pre-convert on the host and include the .bin
  process.exit(0);
}

// Read PBM file (P4 binary format)
const pbmData = await Bun.file(tmpPbm).arrayBuffer();
const pbmBytes = new Uint8Array(pbmData);

// Parse P4 header: "P4\n<width> <height>\n<data>"
let offset = 0;
function readLine(): string {
  let line = "";
  while (offset < pbmBytes.length) {
    const ch = String.fromCharCode(pbmBytes[offset++]);
    if (ch === "\n") break;
    line += ch;
  }
  return line;
}

const magic = readLine();
if (magic !== "P4") {
  console.error(`Unexpected PBM magic: ${magic}`);
  process.exit(1);
}

// Skip comments
let dims = readLine();
while (dims.startsWith("#")) dims = readLine();

const [width, height] = dims.split(" ").map(Number);
const widthBytes = Math.ceil(width / 8);
const rasterData = pbmBytes.slice(offset);

console.log(`Logo: ${width}x${height}, ${widthBytes} bytes/row, ${rasterData.length} bytes raster`);

// Write binary: header (4 bytes) + raster
const header = new Uint8Array(4);
header[0] = widthBytes & 0xff;
header[1] = (widthBytes >> 8) & 0xff;
header[2] = height & 0xff;
header[3] = (height >> 8) & 0xff;

const output = new Uint8Array(4 + rasterData.length);
output.set(header, 0);
output.set(rasterData, 4);

await Bun.write(outputPath, output);
console.log(`Wrote ${output.length} bytes to ${outputPath}`);
