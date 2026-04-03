#!/usr/bin/env bun
/**
 * WiFi Code Printer - HA Yellow Add-on
 *
 * HTTP API server + CloudFlare bridge client + UniFi voucher + ESC/POS printer
 * Web UI for manual voucher generation at GET /
 */

import { print, getStatus, type PrinterConfig } from "./lib/printer";
import { createVoucher, createRadiusAccount, deleteRadiusAccount, type UnifiConfig } from "./lib/unifi";
import { buildReceipt, buildTestReceipt, buildMessageReceipt } from "./lib/receipt";
import { Bridge, type PrintJob } from "./lib/bridge";
import { renderDashboard } from "./lib/dashboard";
import { getClosingTime, formatClosingNote, formatClosingDisplay, type HoursConfig } from "./lib/hours";
import { Reaper } from "./lib/reaper";
import { renderDiagPage } from "./lib/diag";
import { sendPrinterCommand } from "./lib/printer-commands";
import { renderMessagePage } from "./lib/message-page";
import { renderUsersPage } from "./lib/users-page";
import { listManagedUsers, addManagedUser, removeManagedUser, renewManagedUser, getExpiredUsers } from "./lib/user-store";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

// Load config from HA add-on options or environment
function loadConfig() {
  // HA add-on stores options at /data/options.json
  let options: Record<string, unknown> = {};
  try {
    options = JSON.parse(
      require("fs").readFileSync("/data/options.json", "utf-8"),
    );
  } catch {
    // Not running as HA add-on, use environment variables
  }

  function get(key: string, envKey?: string): string {
    return (
      (options[key] as string) ??
      process.env[envKey ?? key.toUpperCase()] ??
      ""
    );
  }

  function getNum(key: string, envKey?: string, fallback = 0): number {
    const v = get(key, envKey);
    return v ? Number(v) : fallback;
  }

  return {
    unifi: {
      host: get("unifi_host", "UNIFI_HOST"),
      apiKey: get("unifi_api_key", "UNIFI_API_KEY"),
      site: get("unifi_site", "UNIFI_SITE") || "default",
    } satisfies UnifiConfig,

    printer: {
      host: get("printer_host", "PRINTER_HOST") || "fika-printer",
      wsPort: getNum("printer_ws_port", "PRINTER_WS_PORT", 10),
      tcpPort: getNum("printer_tcp_port", "PRINTER_TCP_PORT", 9100),
    } satisfies PrinterConfig,

    bridge: {
      url: get("bridge_url", "BRIDGE_URL"),
      secret: get("bridge_secret", "BRIDGE_SECRET"),
      clientId: get("client_id", "CLIENT_ID") || "fika-wifi-printer",
      consume: (get("bridge_consume", "BRIDGE_CONSUME") || "true") !== "false",
    },

    ssid: get("ssid", "SSID") || "fika",
    voucherDurationHours: getNum("voucher_duration_hours", "VOUCHER_DURATION_HOURS", 24),
    voucherQuota: getNum("voucher_quota", "VOUCHER_QUOTA", 1),
    closingTime: get("closing_time", "CLOSING_TIME") || "19:00",
    closedDays: (get("closed_days", "CLOSED_DAYS") || "sun").toLowerCase().split(",").map((d: string) => d.trim()),
    timezone: get("timezone", "TIMEZONE") || "Asia/Bangkok",
    reaperIntervalMinutes: getNum("reaper_interval_minutes", "REAPER_INTERVAL_MINUTES", 5),
    reaperGraceMinutes: getNum("reaper_grace_minutes", "REAPER_GRACE_MINUTES", 5),
    port: getNum("", "PORT", 3000),
  };
}

const config = loadConfig();
const seenReceipts = new Set<string>();

/**
 * Core: generate voucher + print receipt
 */
const hoursConfig: HoursConfig = {
  closingTime: config.closingTime,
  closedDays: config.closedDays,
  timezone: config.timezone,
};

async function handlePrintJob(opts?: {
  durationMinutes?: number;
  durationHours?: number;
  devices?: number;
  receiptId?: string;
  note?: string;
  noExpire?: boolean;
  skipPrint?: boolean;
}): Promise<{ ok: true; voucher_code: string; ssid: string; method: string; duration_minutes: number; valid_until?: string } | { ok: false; error: string }> {
  // Accept minutes (preferred) or hours (legacy), default from config
  const durationMinutes = opts?.durationMinutes ?? (opts?.durationHours ? opts.durationHours * 60 : config.voucherDurationHours * 60);
  const devices = opts?.devices ?? config.voucherQuota;
  const durationHours = Math.ceil(durationMinutes / 60);

  // Calculate closing time for voucher note (unless noExpire)
  const closingTime = opts?.noExpire ? null : getClosingTime(hoursConfig);
  const closingNote = closingTime ? formatClosingNote(closingTime, hoursConfig) : null;
  const validUntil = closingTime ? formatClosingDisplay(closingTime, hoursConfig) : undefined;

  // Build voucher note with closing metadata
  const baseNote = opts?.note ?? `FIKA WiFi`;
  const voucherNote = closingNote ? `${baseNote} | ${closingNote}` : baseNote;

  // Dedup by receipt ID
  if (opts?.receiptId) {
    if (seenReceipts.has(opts.receiptId)) {
      console.log(`[print] Duplicate receipt ${opts.receiptId}, skipping`);
      return { ok: false, error: "duplicate" };
    }
    seenReceipts.add(opts.receiptId);
    // Prune old entries (keep last 1000)
    if (seenReceipts.size > 1000) {
      const first = seenReceipts.values().next().value;
      if (first) seenReceipts.delete(first);
    }
  }

  try {
    if (DRY_RUN) {
      const fakeCode = `${String(Math.random()).slice(2, 7)}-${String(Math.random()).slice(2, 7)}`;
      console.log(`[dry-run] ========================================`);
      console.log(`[dry-run] PRINT JOB TRIGGERED`);
      console.log(`[dry-run]   SSID:     ${config.ssid}`);
      console.log(`[dry-run]   Code:     ${fakeCode}`);
      console.log(`[dry-run]   Duration: ${durationMinutes}min (${durationHours}h)`);
      console.log(`[dry-run]   Devices:  ${devices}`);
      console.log(`[dry-run]   Note:     ${voucherNote}`);
      console.log(`[dry-run]   Valid until: ${validUntil ?? "no expire"}`);
      console.log(`[dry-run]   Receipt:  ${opts?.receiptId ?? "(manual)"}`);
      console.log(`[dry-run] ========================================`);
      return { ok: true, voucher_code: fakeCode, ssid: config.ssid, method: "dry-run", duration_minutes: durationMinutes, valid_until: validUntil };
    }

    // 1. Create UniFi voucher via v1 API
    console.log(`[print] Creating voucher (${durationMinutes}min, ${devices} devices, ${validUntil ? `until ${validUntil}` : "no expire"})...`);
    const voucher = await createVoucher(
      config.unifi,
      durationMinutes,
      devices,
      voucherNote,
    );
    const voucherCode = voucher.code;
    console.log(`[print] Voucher: ${voucherCode} (id: ${voucher.id})`);

    // 2. Build + print receipt (unless skip_print)
    if (opts?.skipPrint) {
      console.log(`[print] Skip print (voucher only)`);
      return { ok: true, voucher_code: voucherCode, ssid: config.ssid, method: "screen-only", duration_minutes: durationMinutes, valid_until: validUntil };
    }

    const receiptData = await buildReceipt({
      ssid: config.ssid,
      code: voucherCode,
      durationMinutes,
      devices,
      validUntil,
    });

    const { method } = await print(config.printer, receiptData);
    console.log(`[print] Printed via ${method}`);

    return { ok: true, voucher_code: voucherCode, ssid: config.ssid, method, duration_minutes: durationMinutes, valid_until: validUntil };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[print] FAILED: ${msg}`);
    console.error(`[print]   Printer: ${config.printer.host}:${config.printer.tcpPort}`);
    console.error(`[print]   UniFi: ${config.unifi.host}`);
    return { ok: false, error: msg };
  }
}

// --- CloudFlare bridge ---

let bridge: Bridge | null = null;

if (config.bridge.url && config.bridge.secret) {
  bridge = new Bridge(config.bridge, async (job: PrintJob) => {
    const result = await handlePrintJob({
      durationMinutes: job.duration_minutes,
      devices: job.devices,
      receiptId: job.receipt_id,
      note: job.product_name ?? `Loyverse ${job.receipt_id ?? job.job_id}`,
    });

    if (result.ok) {
      return {
        status: "ok" as const,
        result: {
          voucher_code: result.voucher_code,
          method: result.method,
          duration_minutes: result.duration_minutes,
        },
      };
    }
    return { status: "error" as const, error: result.error, retry: result.error !== "duplicate" };
  });
  bridge.start();
  console.log(`[bridge] Connecting to ${config.bridge.url} as "${config.bridge.clientId}" consume=${config.bridge.consume}`);
} else {
  console.log("[bridge] No bridge URL configured, running in local-only mode");
}

// --- HTTP API ---

const server = Bun.serve({
  port: config.port,

  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    function json(data: unknown, status = 200) {
      return Response.json(data, {
        status,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // POST /print - generate voucher + print receipt
    if (url.pathname === "/print" && method === "POST") {
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {}

      const rawMinutes = Number(body.duration_minutes) || 0;
      const rawHours = Number(body.duration_hours) || 0;
      const rawDevices = Number(body.devices) || 0;

      const result = await handlePrintJob({
        durationMinutes: rawMinutes > 0 ? Math.max(5, Math.min(43200, rawMinutes)) : undefined,
        durationHours: rawHours > 0 ? Math.max(1, Math.min(720, rawHours)) : undefined,
        devices: rawDevices > 0 ? Math.max(1, Math.min(10, rawDevices)) : undefined,
        receiptId: body.receipt_id as string,
        note: body.note as string,
        noExpire: body.no_expire === true,
        skipPrint: body.skip_print === true,
      });

      return json(result, result.ok ? 200 : 500);
    }

    // POST /test - print test receipt (no voucher)
    if (url.pathname === "/test" && method === "POST") {
      if (DRY_RUN) {
        console.log(`[dry-run] TEST PRINT requested (skipping printer)`);
        return json({ ok: true, method: "dry-run" });
      }
      try {
        const data = await buildTestReceipt();
        const { method: printMethod } = await print(config.printer, data);
        return json({ ok: true, method: printMethod });
      } catch (err) {
        return json({ ok: false, error: String(err) }, 500);
      }
    }

    // GET /status - printer + bridge status
    if (url.pathname === "/status" && method === "GET") {
      let printerStatus: { online: boolean; paper: string; errors: string[] };
      if (DRY_RUN) {
        printerStatus = { online: true, paper: "ok", errors: [] };
      } else {
        try {
          printerStatus = await getStatus(config.printer);
        } catch (err) {
          printerStatus = { online: false, paper: "unknown", errors: [String(err)] };
        }
      }

      return json({
        printer: printerStatus,
        bridge: {
          configured: !!bridge,
          connected: bridge?.connected ?? false,
        },
        config: {
          ssid: config.ssid,
          printer_host: config.printer.host,
          voucher_duration_hours: config.voucherDurationHours,
        },
      });
    }

    // GET /health - liveness
    if (url.pathname === "/health") {
      return json({ ok: true, uptime: process.uptime() });
    }

    // GET / - Web UI dashboard
    if (url.pathname === "/" && method === "GET") {
      return new Response(renderDashboard(config.ssid, config.closingTime), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // GET /message - Message printer page
    if (url.pathname === "/message" && method === "GET") {
      return new Response(renderMessagePage(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // POST /message/print - Print a custom message
    if (url.pathname === "/message/print" && method === "POST") {
      let body: Record<string, unknown> = {};
      try { body = (await req.json()) as Record<string, unknown>; } catch {}
      const subject = (body.subject as string)?.trim();
      if (!subject) return json({ ok: false, error: "subject required" }, 400);

      try {
        if (DRY_RUN) {
          console.log(`[message] DRY RUN: "${subject}"`);
          return json({ ok: true, method: "dry-run" });
        }
        const data = await buildMessageReceipt({
          subject,
          message: (body.message as string)?.trim() || undefined,
          footer: (body.footer as string)?.trim() || undefined,
          includeLogo: body.include_logo !== false,
        });
        const { method: printMethod } = await print(config.printer, data);
        console.log(`[message] Printed "${subject}" via ${printMethod}`);
        return json({ ok: true, method: printMethod });
      } catch (err) {
        return json({ ok: false, error: String(err) }, 500);
      }
    }

    // GET /users - RADIUS user management
    if (url.pathname === "/users" && method === "GET") {
      return new Response(renderUsersPage(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // /users/api/* - RADIUS user CRUD
    if (url.pathname.startsWith("/users/api/")) {
      const action = url.pathname.replace("/users/api/", "");

      if (action === "list") {
        const managed = listManagedUsers();
        return json({ ok: true, accounts: managed });
      }

      if (action === "create" && method === "POST") {
        let body: Record<string, unknown> = {};
        try { body = (await req.json()) as Record<string, unknown>; } catch {}
        const name = (body.name as string)?.trim();
        const password = (body.password as string)?.trim();
        if (!name || !password) return json({ ok: false, error: "name and password required" }, 400);

        const days = Number(body.expiry_days) || 0;
        const expires = days > 0
          ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
          : null;

        try {
          const account = await createRadiusAccount(config.unifi, name, password);
          addManagedUser({ id: account._id, name, created: new Date().toISOString().slice(0, 10), expires });
          console.log(`[users] Created ${name} (expires: ${expires ?? "never"})`);
          return json({ ok: true, account: { ...account, expires } });
        } catch (err) {
          return json({ ok: false, error: String(err) }, 500);
        }
      }

      if (action === "delete" && method === "POST") {
        let body: Record<string, unknown> = {};
        try { body = (await req.json()) as Record<string, unknown>; } catch {}
        const id = body.id as string;
        if (!id) return json({ ok: false, error: "id required" }, 400);
        try {
          await deleteRadiusAccount(config.unifi, id);
          removeManagedUser(id);
          console.log(`[users] Deleted account ${id}`);
          return json({ ok: true });
        } catch (err) {
          return json({ ok: false, error: String(err) }, 500);
        }
      }

      if (action === "renew" && method === "POST") {
        let body: Record<string, unknown> = {};
        try { body = (await req.json()) as Record<string, unknown>; } catch {}
        const id = body.id as string;
        const days = Number(body.days) || 30;
        if (!id) return json({ ok: false, error: "id required" }, 400);
        const expires = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
        renewManagedUser(id, expires);
        console.log(`[users] Renewed ${id} until ${expires}`);
        return json({ ok: true, expires });
      }

      if (action === "print" && method === "POST") {
        let body: Record<string, unknown> = {};
        try { body = (await req.json()) as Record<string, unknown>; } catch {}
        const name = (body.name as string)?.trim();
        const password = (body.password as string)?.trim();
        if (!name || !password) return json({ ok: false, error: "name and password required" }, 400);

        try {
          const data = await buildMessageReceipt({
            subject: "WIFI LOGIN",
            message: `Username: ${name}\nPassword: ${password}${body.expiry ? `\nValid until: ${body.expiry}` : ""}`,
            footer: config.ssid.toUpperCase(),
            includeLogo: true,
          });
          const { method: printMethod } = await print(config.printer, data);
          return json({ ok: true, method: printMethod });
        } catch (err) {
          return json({ ok: false, error: String(err) }, 500);
        }
      }

      return json({ error: "unknown action" }, 404);
    }

    // GET /diag - Printer diagnostics page
    if (url.pathname === "/diag" && method === "GET") {
      return new Response(renderDiagPage(`${config.printer.host}:${config.printer.tcpPort}`), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // POST /diag/cmd - Send printer command
    if (url.pathname === "/diag/cmd" && method === "POST") {
      let body: Record<string, unknown> = {};
      try { body = (await req.json()) as Record<string, unknown>; } catch {}
      const cmd = body.cmd as string;
      if (!cmd) return json({ ok: false, error: "missing cmd" }, 400);
      const result = await sendPrinterCommand(config.printer, cmd);
      return json(result, result.ok ? 200 : 500);
    }

    return json({ error: "not found" }, 404);
  },
});

// --- Reaper ---

if (!DRY_RUN && config.unifi.host && config.unifi.apiKey) {
  const reaper = new Reaper({
    unifi: config.unifi,
    intervalMinutes: config.reaperIntervalMinutes,
    graceMinutes: config.reaperGraceMinutes,
    timezone: config.timezone,
  });
  reaper.start();
} else {
  console.log("[reaper] Disabled (dry-run or no UniFi config)");
}

console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  WiFi Code Printer v0.3.0                      ┃
┃  http://localhost:${String(server.port).padEnd(5)}                      ┃
┃  ${DRY_RUN ? "** DRY RUN MODE - no printer/UniFi **  " : `Closing: ${config.closingTime} (${config.timezone})       `}┃
┃  GET  /       - Web UI (generate codes!)       ┃
┃  POST /print  - Generate voucher + print       ┃
┃  POST /test   - Print test receipt             ┃
┃  GET  /users   - WiFi user management           ┃
┃  GET  /message - Custom message printer        ┃
┃  GET  /diag   - Printer diagnostics             ┃
┃  GET  /status - Printer + bridge status        ┃
┃  GET  /health - Liveness check                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);
