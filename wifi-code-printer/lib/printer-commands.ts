/**
 * Printer EEPROM configuration commands
 *
 * Non-dangerous settings only. No factory reset, no baud rate.
 */

import type { PrinterConfig } from "./printer";

function cat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

// Xprinter vendor protocol (1F 1B 1F prefix)
const VENDOR_PREFIX = [0x1f, 0x1b, 0x1f];

const COMMANDS: Record<string, { label: string; data: Uint8Array }> = {
  // Buzzer - vendor protocol
  cutter_alarm_off: {
    label: "Cutter alarm OFF",
    data: Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x00, 0x04, 0x02, 0x03]),
  },
  cutter_alarm_on: {
    label: "Cutter alarm ON",
    data: Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x01, 0x04, 0x02, 0x03]),
  },
  beep_print_off: {
    label: "Print beep OFF",
    data: Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x00, 0x05, 0x05, 0x01]),
  },
  idle_alarm_off: {
    label: "Idle alarm OFF (vendor guesses)",
    data: cat(
      Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x00, 0x06, 0x02, 0x03]),
      Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x00, 0x06, 0x05, 0x01]),
      Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x00, 0x03, 0x02, 0x03]),
      Uint8Array.from([...VENDOR_PREFIX, 0xe0, 0x13, 0x14, 0x00, 0x07, 0x02, 0x03]),
    ),
  },

  // Print width
  width_72: {
    label: "Print width 72mm",
    data: Uint8Array.from([...VENDOR_PREFIX, 0xe1, 0x13, 0x14, 0x00]),
  },
  width_80: {
    label: "Print width 80mm",
    data: Uint8Array.from([...VENDOR_PREFIX, 0xe1, 0x13, 0x14, 0x02]),
  },

  // Print density (1-8)
  density_1: { label: "Density 1 (lightest)", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x01]) },
  density_2: { label: "Density 2", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x02]) },
  density_3: { label: "Density 3", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x03]) },
  density_4: { label: "Density 4", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x04]) },
  density_5: { label: "Density 5 (default)", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x05]) },
  density_6: { label: "Density 6", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x06]) },
  density_7: { label: "Density 7", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x07]) },
  density_8: { label: "Density 8 (darkest)", data: Uint8Array.from([...VENDOR_PREFIX, 0x13, 0x14, 0x08]) },
};

// Epson GS(E) protocol for buzzer
const GS = 0x1d;
function writeSettingCmd(a: number, value: number): Uint8Array {
  return Uint8Array.from([GS, 0x28, 0x45, 0x04, 0x00, 0x05, a, value & 0xff, (value >> 8) & 0xff]);
}

COMMANDS.buzzer_off = {
  label: "All beeps OFF (vendor)",
  data: cat(COMMANDS.cutter_alarm_off.data, COMMANDS.beep_print_off.data, COMMANDS.idle_alarm_off.data),
};

COMMANDS.buzzer_on = {
  label: "Beeps ON (cutter alarm)",
  data: COMMANDS.cutter_alarm_on.data,
};

COMMANDS.epson_buzzer_off = {
  label: "All beeps OFF (Epson GS(E))",
  data: cat(
    Uint8Array.from([GS, 0x28, 0x45, 0x03, 0x00, 0x01, 0x49, 0x4e]), // enter settings
    writeSettingCmd(119, 0), // master buzzer off
    writeSettingCmd(120, 0), // error buzz off
    writeSettingCmd(122, 0), // autocut buzz off
    writeSettingCmd(124, 0), // pulse1 buzz off
    writeSettingCmd(126, 0), // pulse2 buzz off
    Uint8Array.from([GS, 0x28, 0x45, 0x04, 0x00, 0x02, 0x4f, 0x55, 0x54]), // exit + reset
  ),
};

export async function sendPrinterCommand(config: PrinterConfig, cmd: string): Promise<{ ok: boolean; bytes: number; label: string; error?: string }> {
  const command = COMMANDS[cmd];
  if (!command) return { ok: false, bytes: 0, label: cmd, error: `Unknown command: ${cmd}` };

  try {
    await sendTCP(config.host, config.tcpPort, command.data);
    console.log(`[diag] Sent ${cmd}: ${command.label} (${command.data.length} bytes)`);
    return { ok: true, bytes: command.data.length, label: command.label };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[diag] Failed ${cmd}: ${msg}`);
    return { ok: false, bytes: 0, label: command.label, error: msg };
  }
}

function sendTCP(host: string, port: number, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`TCP timeout ${host}:${port}`)), 5000);
    Bun.connect({
      hostname: host, port,
      socket: {
        open(socket) {
          socket.write(data);
          socket.flush();
          setTimeout(() => { clearTimeout(timeout); socket.end(); resolve(); }, 1000);
        },
        data() {},
        error(_, err) { clearTimeout(timeout); reject(err); },
        close() { clearTimeout(timeout); resolve(); },
      },
    });
  });
}
