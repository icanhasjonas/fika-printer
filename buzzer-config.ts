#!/usr/bin/env bun
/**
 * FIKA Printer Buzzer Configuration Tool
 *
 * Two command protocols:
 *   1. Xprinter vendor protocol (1F 1B 1F prefix) -- most likely to work on XP-C300H
 *   2. Epson GS ( E standard -- fallback if vendor protocol doesn't work
 *
 * Usage:
 *   bun buzzer-config.ts disable           # Disable buzzer (vendor protocol)
 *   bun buzzer-config.ts enable            # Re-enable buzzer
 *   bun buzzer-config.ts disable --epson   # Try Epson GS(E) protocol instead
 *   bun buzzer-config.ts status            # Printer status check
 *   bun buzzer-config.ts read              # Try reading settings (probably won't respond)
 *   bun buzzer-config.ts --dry-run disable # Show bytes without sending
 */

// ============================================================
// Xprinter Vendor Protocol (1F 1B 1F prefix)
// Reverse-engineered from MUNBYN/Xprinter/Storyous docs
// and blog.lambda.cx USB captures
// ============================================================
const VENDOR = {
  // Cutter alarm (beep after cut)
  cutterAlarmOn:  Uint8Array.from([0x1f, 0x1b, 0x1f, 0xe0, 0x13, 0x14, 0x01, 0x04, 0x02, 0x03]),
  cutterAlarmOff: Uint8Array.from([0x1f, 0x1b, 0x1f, 0xe0, 0x13, 0x14, 0x00, 0x04, 0x02, 0x03]),

  // Beep/buzzer on print (close beep sound)
  beepOnPrintOff: Uint8Array.from([0x1f, 0x1b, 0x1f, 0xe0, 0x13, 0x14, 0x00, 0x05, 0x05, 0x01]),

  // Factory reset (DANGEROUS!)
  factoryReset:   Uint8Array.from([0x1f, 0x1b, 0x1f, 0x11, 0x11, 0x00]),
};

// ============================================================
// Epson GS ( E Standard Protocol
// ============================================================
const GS = 0x1d;

const GSE = {
  enterSettings: Uint8Array.from([GS, 0x28, 0x45, 0x03, 0x00, 0x01, 0x49, 0x4e]),
  exitSettings:  Uint8Array.from([GS, 0x28, 0x45, 0x04, 0x00, 0x02, 0x4f, 0x55, 0x54]),
};

const BUZZER_SETTINGS: Record<number, string> = {
  119: "Buzzer enable/disable (0=off, 1=on)",
  120: "Buzzer repeat on error (0=no sound)",
  121: "Buzzer pattern on autocut (1-5 = A-E)",
  122: "Buzzer repeat on autocut (0=no sound)",
  123: "Buzzer pattern on pulse 1 (1-5 = A-E)",
  124: "Buzzer repeat on pulse 1 (0=no sound)",
  125: "Buzzer pattern on pulse 2 (1-5 = A-E)",
  126: "Buzzer repeat on pulse 2 (0=no sound)",
};

function readSettingCmd(a: number): Uint8Array {
  return Uint8Array.from([GS, 0x28, 0x45, 0x02, 0x00, 0x06, a]);
}

function writeSettingCmd(a: number, value: number): Uint8Array {
  return Uint8Array.from([GS, 0x28, 0x45, 0x04, 0x00, 0x05, a, value & 0xff, (value >> 8) & 0xff]);
}

function readMemorySwitchCmd(msw: number): Uint8Array {
  return Uint8Array.from([GS, 0x28, 0x45, 0x02, 0x00, 0x04, msw]);
}

function cat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function hexDump(data: Uint8Array, label: string): void {
  const hex = Array.from(data).map(b => b.toString(16).padStart(2, "0")).join(" ");
  console.log(`  ${label}: ${hex} (${data.length} bytes)`);
}

async function sendTCP(host: string, port: number, data: Uint8Array, expectResponse = false): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve(null), 5000);
    const chunks: Uint8Array[] = [];
    Bun.connect({
      hostname: host, port,
      socket: {
        open(socket) {
          socket.write(data); socket.flush();
          if (!expectResponse) {
            setTimeout(() => { clearTimeout(timeout); socket.end(); resolve(null); }, 1000);
          }
        },
        data(_, chunk) {
          chunks.push(new Uint8Array(chunk));
          clearTimeout(timeout);
          setTimeout(() => resolve(cat(...chunks)), 500);
        },
        error(_, err) { clearTimeout(timeout); reject(err); },
        close() { clearTimeout(timeout); resolve(chunks.length > 0 ? cat(...chunks) : null); },
      },
    });
  });
}

// --- CLI ---
const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith("--")) ?? "help";
const host = (() => { const i = args.indexOf("--host"); return i >= 0 && i + 1 < args.length ? args[i + 1] : "fika-printer"; })();
const dryRun = args.includes("--dry-run");
const useEpson = args.includes("--epson");
const port = 9100;

if (command === "help" || args.includes("-h") || args.includes("--help")) {
  console.log(`FIKA Printer Buzzer Config

Usage:
  bun buzzer-config.ts <command> [options]

Commands:
  disable    Disable buzzer (vendor 1F1B1F protocol)
  enable     Re-enable buzzer
  status     Printer status check (DLE EOT)
  read       Read buzzer settings (GS(E) -- probably no response on this clone)
  msw        Read memory switches (GS(E) -- probably no response)

Options:
  --host <host>   Printer hostname/IP (default: fika-printer)
  --dry-run       Show hex bytes without sending
  --epson         Use Epson GS(E) protocol instead of vendor protocol

Protocols:
  Default uses Xprinter vendor commands (1F 1B 1F prefix).
  These are the proprietary commands the Windows utility sends.
  Use --epson to try the standard Epson GS(E) approach instead.

WARNING: Writes to EEPROM. Limited write cycles. Don't spam!`);
  process.exit(0);
}

console.log(`Printer: ${host}:${port}`);
console.log(`Command: ${command}${useEpson ? " (Epson GS(E))" : " (Vendor 1F1B1F)"}${dryRun ? " (DRY RUN)" : ""}`);
console.log();

// ============================================================
// DISABLE
// ============================================================
if (command === "disable") {
  if (useEpson) {
    console.log("Disabling buzzer via Epson GS(E) protocol...\n");
    const sequence = cat(
      GSE.enterSettings,
      writeSettingCmd(119, 0), writeSettingCmd(120, 0),
      writeSettingCmd(122, 0), writeSettingCmd(124, 0), writeSettingCmd(126, 0),
      GSE.exitSettings,
    );
    hexDump(GSE.enterSettings, "Enter settings mode");
    hexDump(writeSettingCmd(119, 0), "Set a=119 (buzzer) = 0 (off)");
    hexDump(writeSettingCmd(120, 0), "Set a=120 (error buzz) = 0");
    hexDump(writeSettingCmd(122, 0), "Set a=122 (autocut buzz) = 0");
    hexDump(writeSettingCmd(124, 0), "Set a=124 (pulse1 buzz) = 0");
    hexDump(writeSettingCmd(126, 0), "Set a=126 (pulse2 buzz) = 0");
    hexDump(GSE.exitSettings, "Exit settings (triggers soft reset)");
    console.log(`\n  Total: ${sequence.length} bytes`);
    if (!dryRun) { console.log("\n  Sending..."); await sendTCP(host, port, sequence); console.log("  Sent!"); }
    else console.log("\n  DRY RUN - nothing sent.");
  } else {
    console.log("Disabling buzzer via Xprinter vendor protocol...\n");
    console.log("  Sending TWO commands:");
    hexDump(VENDOR.cutterAlarmOff, "Cutter alarm OFF (1F 1B 1F E0 ... 00 04 02 03)");
    hexDump(VENDOR.beepOnPrintOff, "Beep on print OFF (1F 1B 1F E0 ... 00 05 05 01)");

    const sequence = cat(VENDOR.cutterAlarmOff, VENDOR.beepOnPrintOff);
    console.log(`\n  Total: ${sequence.length} bytes`);

    if (!dryRun) {
      console.log("\n  Sending cutter alarm OFF...");
      await sendTCP(host, port, VENDOR.cutterAlarmOff);
      console.log("  Sending beep on print OFF...");
      await sendTCP(host, port, VENDOR.beepOnPrintOff);
      console.log("  Done! Print something to test if buzzer is silent.");
    } else {
      console.log("\n  DRY RUN - nothing sent.");
    }
  }
}

// ============================================================
// ENABLE
// ============================================================
else if (command === "enable") {
  if (useEpson) {
    console.log("Re-enabling buzzer via Epson GS(E)...\n");
    const sequence = cat(
      GSE.enterSettings,
      writeSettingCmd(119, 1), writeSettingCmd(120, 1),
      writeSettingCmd(121, 1), writeSettingCmd(122, 1),
      GSE.exitSettings,
    );
    hexDump(sequence, "Full enable sequence");
    if (!dryRun) { console.log("\n  Sending..."); await sendTCP(host, port, sequence); console.log("  Sent!"); }
    else console.log("\n  DRY RUN - nothing sent.");
  } else {
    console.log("Re-enabling buzzer via Xprinter vendor protocol...\n");
    hexDump(VENDOR.cutterAlarmOn, "Cutter alarm ON");
    if (!dryRun) {
      console.log("\n  Sending...");
      await sendTCP(host, port, VENDOR.cutterAlarmOn);
      console.log("  Done!");
    } else {
      console.log("\n  DRY RUN - nothing sent.");
    }
  }
}

// ============================================================
// STATUS (read-only, always safe)
// ============================================================
else if (command === "status") {
  console.log("Checking printer status (DLE EOT)...\n");
  // Send all 4 queries in one connection for better response rate
  const allQueries = cat(
    Uint8Array.from([0x10, 0x04, 0x01]),
    Uint8Array.from([0x10, 0x04, 0x02]),
    Uint8Array.from([0x10, 0x04, 0x03]),
    Uint8Array.from([0x10, 0x04, 0x04]),
  );
  const resp = await sendTCP(host, port, allQueries, true);
  if (resp && resp.length >= 4) {
    const labels = ["Printer", "Offline", "Error", "Paper"];
    for (let i = 0; i < Math.min(resp.length, 4); i++) {
      const byte = resp[i];
      const bin = byte.toString(2).padStart(8, "0");
      console.log(`  ${labels[i].padEnd(8)}: 0x${byte.toString(16).padStart(2, "0")} (${bin})`);
    }
    // Decode paper status
    if (resp.length >= 4) {
      const paper = resp[3];
      const nearEnd = (paper & 0x0c) !== 0;
      const out = (paper & 0x60) !== 0;
      console.log(`\n  Paper: ${out ? "OUT!" : nearEnd ? "Near end" : "OK"}`);
    }
  } else {
    console.log("  No response (printer offline or unreachable)");
  }
}

// ============================================================
// READ (GS(E) - likely no response on Xprinter clones)
// ============================================================
else if (command === "read") {
  console.log("Reading buzzer settings via GS(E)...");
  console.log("(Note: Xprinter clones often don't respond to read commands)\n");
  for (const [aStr, desc] of Object.entries(BUZZER_SETTINGS)) {
    const a = Number(aStr);
    const cmd = readSettingCmd(a);
    if (dryRun) { hexDump(cmd, `Read a=${a}`); continue; }
    const resp = await sendTCP(host, port, cmd, true);
    if (resp && resp.length > 0) {
      const hex = Array.from(resp).map(b => b.toString(16).padStart(2, "0")).join(" ");
      if (resp[0] === 0x37 && resp[1] === 0x23 && resp.length >= 5) {
        const value = resp[3] | (resp[4] << 8);
        console.log(`  a=${a} (0x${a.toString(16)}): ${value} -- ${desc}`);
      } else {
        console.log(`  a=${a} (0x${a.toString(16)}): raw=${hex} -- ${desc}`);
      }
    } else {
      console.log(`  a=${a} (0x${a.toString(16)}): no response -- ${desc}`);
    }
  }
}

// ============================================================
// MSW (memory switches - likely no response)
// ============================================================
else if (command === "msw") {
  console.log("Reading memory switches (Msw1-Msw8)...\n");
  for (let msw = 1; msw <= 8; msw++) {
    const cmd = readMemorySwitchCmd(msw);
    if (dryRun) { hexDump(cmd, `Read Msw${msw}`); continue; }
    const resp = await sendTCP(host, port, cmd, true);
    if (resp && resp.length >= 10 && resp[0] === 0x37 && resp[1] === 0x21) {
      const bits = Array.from(resp.slice(2, 10)).map(b => b === 0x31 ? "1" : b === 0x30 ? "0" : "?").join("");
      console.log(`  Msw${msw}: ${bits} (b8..b1)`);
    } else if (resp && resp.length > 0) {
      console.log(`  Msw${msw}: raw=${Array.from(resp).map(b => b.toString(16).padStart(2, "0")).join(" ")}`);
    } else {
      console.log(`  Msw${msw}: no response`);
    }
  }
}

else {
  console.error(`Unknown command: ${command}. Run with --help for usage.`);
  process.exit(1);
}
