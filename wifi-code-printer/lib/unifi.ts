/**
 * UniFi voucher management via API
 *
 * Uses the classic UniFi API (not the integration API) for hotspot vouchers.
 * Auth: API key via X-API-KEY header.
 */

export interface UnifiConfig {
  host: string;
  apiKey: string;
  site: string;
}

export interface Voucher {
  _id: string;
  code: string;
  create_time: number;
  duration: number;
  quota: number;
  used: number;
  note?: string;
  status: string;
  status_expires: number;
}

async function unifiRequest(config: UnifiConfig, path: string, body?: unknown): Promise<unknown> {
  const url = `${config.host}/proxy/network/api/s/${config.site}${path}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "X-API-KEY": config.apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    // @ts-ignore -- Bun supports this for self-signed certs
    tls: { rejectUnauthorized: false },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UniFi API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { meta: { rc: string; msg?: string }; data: unknown[] };
  if (json.meta?.rc !== "ok") {
    throw new Error(`UniFi API error: ${json.meta?.msg ?? "unknown"}`);
  }

  return json.data;
}

/**
 * Create a single-use WiFi voucher
 * @returns The voucher code (formatted as XXXXX-XXXXX)
 */
export async function createVoucher(
  config: UnifiConfig,
  durationHours: number,
  quota = 1,
  note?: string,
): Promise<string> {
  const uniqueNote = note
    ? `${note} [${crypto.randomUUID().slice(0, 8)}]`
    : `FIKA WiFi - ${new Date().toISOString()} [${crypto.randomUUID().slice(0, 8)}]`;

  const data = (await unifiRequest(config, "/cmd/hotspot", {
    cmd: "create-voucher",
    n: 1,
    expire: durationHours * 60, // API expects minutes
    quota,
    note: uniqueNote,
  })) as { create_time: number }[];

  if (!data || !data[0]) {
    throw new Error("No voucher returned from UniFi");
  }

  // Fetch the created voucher to get the code
  // Match on both create_time AND unique note to avoid race conditions
  const createTime = data[0].create_time;
  const vouchers = (await listVouchers(config)) as Voucher[];
  const match = vouchers.find((v) => v.create_time === createTime && v.note === uniqueNote)
    ?? vouchers.find((v) => v.create_time === createTime);

  if (!match) {
    throw new Error("Created voucher but could not find it in voucher list");
  }

  return formatVoucherCode(match.code);
}

/**
 * List all vouchers
 */
export async function listVouchers(config: UnifiConfig): Promise<Voucher[]> {
  return (await unifiRequest(config, "/stat/voucher")) as Voucher[];
}

/**
 * Delete a voucher
 */
export async function deleteVoucher(config: UnifiConfig, voucherId: string): Promise<void> {
  await unifiRequest(config, "/cmd/hotspot", {
    cmd: "delete-voucher",
    _id: voucherId,
  });
}

/**
 * Guest session from stat/guest
 */
export interface GuestSession {
  _id: string;
  mac: string;
  voucher_id?: string;
  voucher_code?: string;
  expired: boolean;
  ip?: string;
  hostname?: string;
  ap_mac?: string;
}

/**
 * List guest sessions
 */
export async function listGuests(config: UnifiConfig): Promise<GuestSession[]> {
  return (await unifiRequest(config, "/stat/guest")) as GuestSession[];
}

/**
 * Terminate a guest session (kick + deauth)
 */
export async function terminateGuest(config: UnifiConfig, guestId: string): Promise<void> {
  await unifiRequest(config, "/cmd/hotspot", {
    cmd: "terminate",
    _id: guestId,
  });
}

/**
 * Unauthorize a guest by MAC (belt and suspenders)
 */
export async function unauthorizeGuest(config: UnifiConfig, mac: string): Promise<void> {
  await unifiRequest(config, "/cmd/stamgr", {
    cmd: "unauthorize-guest",
    mac,
  });
}

/**
 * Format raw voucher code with dash (XXXXX-XXXXX)
 */
function formatVoucherCode(code: string): string {
  const clean = code.replace(/-/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return code;
}
