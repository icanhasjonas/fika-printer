/**
 * UniFi voucher + guest + RADIUS management
 *
 * Uses the official v1 Integration API for vouchers (single-call create with code returned).
 * Falls back to classic API for guest/RADIUS management (not in v1 yet).
 * Auth: API key via X-API-KEY header.
 */

export interface UnifiConfig {
  host: string;
  apiKey: string;
  site: string;
}

// v1 site UUID - resolved on first use
let v1SiteId: string | null = null;

export interface Voucher {
  id: string;
  code: string;
  name?: string;
  createdAt?: string;
  timeLimitMinutes?: number;
  authorizedGuestLimit?: number;
  authorizedGuestCount?: number;
  expired?: boolean;
  // Classic API fields (kept for compat)
  _id?: string;
  create_time?: number;
  duration?: number;
  quota?: number;
  used?: number;
  note?: string;
  status?: string;
}

// Classic API (for guest mgmt, RADIUS, etc.)
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

// v1 Integration API (for vouchers)
async function getV1SiteId(config: UnifiConfig): Promise<string> {
  if (v1SiteId) return v1SiteId;
  const url = `${config.host}/proxy/network/integrations/v1/sites`;
  const res = await fetch(url, {
    headers: { "X-API-KEY": config.apiKey },
    // @ts-ignore
    tls: { rejectUnauthorized: false },
  });
  if (!res.ok) throw new Error(`v1 API sites: ${res.status}`);
  const json = (await res.json()) as { data: { id: string; name: string }[] };
  const site = json.data.find((s) => s.name === "Default") ?? json.data[0];
  if (!site) throw new Error("No sites found in v1 API");
  v1SiteId = site.id;
  console.log(`[unifi] v1 site ID: ${v1SiteId}`);
  return v1SiteId;
}

async function v1Request(config: UnifiConfig, method: string, path: string, body?: unknown): Promise<unknown> {
  const siteId = await getV1SiteId(config);
  const url = `${config.host}/proxy/network/integrations/v1/sites/${siteId}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-API-KEY": config.apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    // @ts-ignore
    tls: { rejectUnauthorized: false },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UniFi v1 API ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Create a single-use WiFi voucher via v1 API
 * Returns the voucher code directly (no second fetch needed).
 */
export async function createVoucher(
  config: UnifiConfig,
  durationMinutes: number,
  quota = 1,
  note?: string,
): Promise<{ code: string; id: string }> {
  const result = (await v1Request(config, "POST", "/hotspot/vouchers", {
    name: note ?? `FIKA WiFi - ${new Date().toISOString()}`,
    timeLimitMinutes: durationMinutes,
    count: 1,
    authorizedGuestLimit: quota,
  })) as { vouchers: { id: string; code: string; timeLimitMinutes: number }[] };

  if (!result.vouchers?.[0]) {
    throw new Error("No voucher returned from UniFi v1 API");
  }

  const v = result.vouchers[0];
  return { code: formatVoucherCode(v.code), id: v.id };
}

/**
 * List vouchers via v1 API
 */
export async function listVouchers(config: UnifiConfig): Promise<Voucher[]> {
  const result = (await v1Request(config, "GET", "/hotspot/vouchers?limit=200")) as { data: Voucher[] };
  return result.data ?? [];
}

/**
 * Delete a voucher via v1 API
 */
export async function deleteVoucher(config: UnifiConfig, voucherId: string): Promise<void> {
  await v1Request(config, "DELETE", `/hotspot/vouchers/${voucherId}`);
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

// ============================================================
// RADIUS Accounts
// ============================================================

export interface RadiusAccount {
  _id: string;
  name: string;
  x_password: string;
  site_id?: string;
  note?: string;
  vlan?: string;
  tunnel_type?: number;
  tunnel_medium_type?: number;
}

export async function listRadiusAccounts(config: UnifiConfig): Promise<RadiusAccount[]> {
  return (await unifiRequest(config, "/rest/account")) as RadiusAccount[];
}

export async function createRadiusAccount(config: UnifiConfig, name: string, password: string): Promise<RadiusAccount> {
  const data = (await unifiRequest(config, "/rest/account", { name, x_password: password })) as RadiusAccount[];
  if (!data?.[0]) throw new Error("Failed to create RADIUS account");
  return data[0];
}

export async function updateRadiusAccount(config: UnifiConfig, id: string, updates: Partial<{ name: string; x_password: string; note: string }>): Promise<void> {
  const url = `${config.host}/proxy/network/api/s/${config.site}/rest/account/${id}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "X-API-KEY": config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    // @ts-ignore
    tls: { rejectUnauthorized: false },
  });
  if (!res.ok) throw new Error(`UniFi API ${res.status}: ${await res.text()}`);
}

export async function deleteRadiusAccount(config: UnifiConfig, id: string): Promise<void> {
  const url = `${config.host}/proxy/network/api/s/${config.site}/rest/account/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "X-API-KEY": config.apiKey },
    // @ts-ignore
    tls: { rejectUnauthorized: false },
  });
  if (!res.ok) throw new Error(`UniFi API ${res.status}: ${await res.text()}`);
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
