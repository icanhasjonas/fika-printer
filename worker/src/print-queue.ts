/**
 * PrintQueue Durable Object
 *
 * Message broker for WiFi code print jobs.
 *
 * Protocol:
 *   1. Client connects via WebSocket
 *   2. Client authenticates: { type: "auth", secret, client_id }
 *   3. Client subscribes: { type: "subscribe", subject: "wifi", consume: true, replay: true }
 *   4. DO delivers jobs to subscribers
 *   5. Consumers ack: { type: "ack", job_id, status: "ok"|"error", result?, error?, retry? }
 *
 * Consumers (consume=true) claim jobs exclusively. Observers (consume=false) see copies.
 * Claimed jobs timeout after 120s and return to pending.
 * Jobs expire after 12h.
 */

import type { Env } from "./index";
import { renderDashboard } from "./dashboard";

// --- Product matching ---

interface WifiProduct {
  item_id: string;
  item_name: string;
  duration_minutes: number;
  devices: number;
}

const WIFI_PRODUCTS: WifiProduct[] = [
  { item_id: "ca87df6b-24ef-4962-a954-59a551adc1c6", item_name: "Wifi 30 min", duration_minutes: 30, devices: 1 },
  { item_id: "91b96f9c-7079-4e1f-899f-546016972a83", item_name: "Working in cafe", duration_minutes: 120, devices: 1 },
  { item_id: "32e96796-851b-4e94-9006-30a54104c2c7", item_name: "High season space B", duration_minutes: 720, devices: 2 },
];

// --- Types ---

interface WebhookLog {
  id: string;
  timestamp: string;
  type: string;
  raw: unknown;
  receipt_number?: string;
  receipt_type?: string;
  total_money?: number;
  items?: string[];
  wifi_matches?: string[];
}

interface JobCompletion {
  client_id: string;
  status: "ok" | "error";
  error?: string;
  result?: Record<string, unknown>;
  completed_at: string;
}

interface PrintJob {
  id: string;
  created_at: string;
  receipt_id: string;
  duration_minutes: number;
  devices: number;
  product_name: string;
  status: "pending" | "claimed" | "completed" | "failed" | "expired";
  claimed_by?: string;
  claimed_at?: string;
  completions: JobCompletion[];
}

const CLAIM_TIMEOUT_MS = 120_000;  // 2 minutes
const JOB_EXPIRY_MS = 12 * 60 * 60 * 1000;  // 12 hours
const PING_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;

// --- Durable Object ---

// Stored on each WebSocket via setAttachment/getAttachment (survives hibernation)
interface WsAttachment {
  client_id: string;
  authed: boolean;
  subscriptions: Record<string, { consume: boolean; replay: boolean }>;
  connected_at: string;
  last_pong: number;
}

const MAX_QUEUE_SIZE = 100;
const MAX_WEBHOOK_QUANTITY = 5;

export class PrintQueue {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async verifyWebhookSignature(request: Request): Promise<{ ok: boolean; body: string }> {
    const body = await request.text();
    if (!this.env.WEBHOOK_SECRET) return { ok: true, body }; // no secret configured = skip verification

    const signature = request.headers.get("x-loyverse-signature") ?? "";
    if (!signature) return { ok: false, body };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.env.WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    const actual = hexToBytes(signature);
    if (actual.byteLength !== expected.byteLength) return { ok: false, body };
    return { ok: crypto.subtle.timingSafeEqual(expected, actual), body };
  }

  private requireBasicAuth(request: Request): Response | null {
    const user = this.env.DASHBOARD_USER ?? "hello";
    const pass = this.env.DASHBOARD_PASS ?? "world";
    const auth = request.headers.get("Authorization") ?? "";
    if (auth.startsWith("Basic ")) {
      const decoded = atob(auth.slice(6));
      const [u, p] = decoded.split(":");
      if (u === user && p === pass) return null;
    }
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="FIKA Dashboard"' },
    });
  }

  // Get all connected websockets with their metadata (survives hibernation)
  private getClients(): Map<string, { socket: WebSocket; meta: WsAttachment }> {
    const result = new Map<string, { socket: WebSocket; meta: WsAttachment }>();
    for (const ws of this.state.getWebSockets()) {
      const meta = ws.deserializeAttachment() as WsAttachment | null;
      if (meta?.authed && meta.client_id) {
        result.set(meta.client_id, { socket: ws, meta });
      }
    }
    return result;
  }

  private getWsMeta(ws: WebSocket): WsAttachment | null {
    return ws.deserializeAttachment() as WsAttachment | null;
  }

  private setWsMeta(ws: WebSocket, meta: WsAttachment): void {
    ws.serializeAttachment(meta);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Webhook - HMAC verified, no basic auth
    if (url.pathname === "/webhook/loyverse" && method === "POST") return this.handleWebhook(request);

    // WebSocket - auth handled by protocol
    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") return this.handleWebSocketUpgrade();

    // Everything else requires basic auth
    const authErr = this.requireBasicAuth(request);
    if (authErr) return authErr;

    // API
    if (url.pathname === "/api/events") return this.apiGetEvents(url);
    if (url.pathname === "/api/queue") return this.apiGetQueue();
    if (url.pathname === "/api/stats") return this.apiGetStats();
    if (url.pathname === "/api/clients") return this.apiGetClients();
    if (url.pathname === "/api/test-job" && method === "POST") return this.apiCreateTestJob();
    if (url.pathname === "/api/clear" && method === "POST") return this.apiClear(url);

    // Dashboard
    if (url.pathname === "/" || url.pathname === "/dashboard") {
      const events = await this.getEvents(50);
      const queue = await this.getQueue();
      const stats = await this.getStats();
      const clients = this.getClientSummaries();
      return new Response(renderDashboard(events, queue, stats, clients), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  }

  // ============================================================
  // WEBHOOK HANDLER
  // ============================================================

  private async handleWebhook(request: Request): Promise<Response> {
    // HMAC signature verification
    const { ok: sigValid, body: rawBody } = await this.verifyWebhookSignature(request);
    const sig = request.headers.get("x-loyverse-signature") ?? "(none)";
    console.log(`[webhook] Signature header: ${sig}`);
    console.log(`[webhook] WEBHOOK_SECRET configured: ${!!this.env.WEBHOOK_SECRET}`);
    console.log(`[webhook] Signature valid: ${sigValid}`);
    if (!sigValid) {
      console.error(`[webhook] HMAC verification failed! sig=${sig}`);
      return Response.json({ error: "invalid signature" }, { status: 403 });
    }

    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }

    const payload = body as Record<string, unknown>;
    const type = (payload.type as string) ?? "unknown";
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    let receiptNumber: string | undefined;
    let receiptType: string | undefined;
    let totalMoney: number | undefined;
    let items: string[] | undefined;
    const wifiMatches: Array<{ product: WifiProduct; quantity: number }> = [];

    if (type === "receipts.update" && Array.isArray(payload.receipts)) {
      const receipt = payload.receipts[0] as Record<string, unknown>;
      receiptNumber = receipt.receipt_number as string;
      receiptType = receipt.receipt_type as string;
      totalMoney = receipt.total_money as number;
      const lineItems = (receipt.line_items ?? []) as Array<{ item_id: string; item_name: string; quantity: number }>;
      items = lineItems.map((li) => li.item_name);

      for (const li of lineItems) {
        const match = WIFI_PRODUCTS.find((p) => p.item_id === li.item_id);
        if (match) wifiMatches.push({ product: match, quantity: Math.min(li.quantity ?? 1, MAX_WEBHOOK_QUANTITY) });
      }
    }

    const event: WebhookLog = {
      id, timestamp, type, raw: payload,
      receipt_number: receiptNumber, receipt_type: receiptType,
      total_money: totalMoney, items,
      wifi_matches: wifiMatches.map((m) => `${m.product.item_name} x${m.quantity}`),
    };
    await this.storeEvent(event);

    // Create jobs for matching WiFi products
    let jobsCreated = 0;
    if (type === "receipts.update" && receiptType === "SALE" && receiptNumber && wifiMatches.length > 0) {
      for (const match of wifiMatches) {
        for (let i = 0; i < match.quantity; i++) {
          const job: PrintJob = {
            id: crypto.randomUUID(),
            created_at: timestamp,
            receipt_id: `${receiptNumber}:${match.product.item_id}:${i}`,
            duration_minutes: match.product.duration_minutes,
            devices: match.product.devices,
            product_name: match.product.item_name,
            status: "pending",
            completions: [],
          };
          await this.enqueueJob(job);
          jobsCreated++;
        }
      }
      // Deliver to subscribers
      await this.deliverPendingJobs();
      this.ensureAlarm();
      console.log(`[webhook] ${receiptNumber}: ${wifiMatches.length} product(s), ${jobsCreated} job(s)`);
    } else if (type === "receipts.update" && receiptType === "SALE") {
      console.log(`[webhook] ${receiptNumber}: no WiFi products, skipping`);
    }

    return Response.json({ ok: true, event_id: id, wifi_matches: wifiMatches.length, jobs_created: jobsCreated });
  }

  // ============================================================
  // WEBSOCKET PROTOCOL
  // ============================================================

  private handleWebSocketUpgrade(): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      this.wsSend(ws, { type: "error", error: "invalid json" });
      return;
    }

    const msgType = msg.type as string;

    // --- AUTH ---
    if (msgType === "auth") {
      const clientId = msg.client_id as string;
      const secret = msg.secret as string;

      if (!clientId || !secret) {
        this.wsSend(ws, { type: "auth_error", error: "client_id and secret required" });
        return;
      }

      const encoder = new TextEncoder();
      const a = encoder.encode(secret);
      const b = encoder.encode(this.env.WS_SECRET ?? "");
      if (a.byteLength !== b.byteLength || !crypto.subtle.timingSafeEqual(a, b)) {
        this.wsSend(ws, { type: "auth_error", error: "invalid secret" });
        ws.close(4001, "invalid secret");
        return;
      }

      // If this client_id already has a connection, replace it
      const clients = this.getClients();
      const existing = clients.get(clientId);
      if (existing && existing.socket !== ws) {
        console.log(`[ws] ${clientId} reconnected, replacing old socket`);
        await this.releaseClaimedJobs(clientId);
        try { existing.socket.close(1000, "replaced"); } catch {}
      }

      const meta: WsAttachment = {
        client_id: clientId,
        authed: true,
        subscriptions: {},
        connected_at: new Date().toISOString(),
        last_pong: Date.now(),
      };
      this.setWsMeta(ws, meta);

      this.wsSend(ws, { type: "auth_ok", client_id: clientId });
      console.log(`[ws] ${clientId} authenticated`);
      return;
    }

    // All other messages require auth
    const meta = this.getWsMeta(ws);
    if (!meta?.authed) {
      this.wsSend(ws, { type: "error", error: "not authenticated" });
      return;
    }

    // --- PONG ---
    if (msgType === "pong") {
      meta.last_pong = Date.now();
      this.setWsMeta(ws, meta);
      return;
    }

    // --- SUBSCRIBE ---
    if (msgType === "subscribe") {
      const subject = msg.subject as string;
      if (!subject) {
        this.wsSend(ws, { type: "error", error: "subject required" });
        return;
      }

      const consume = msg.consume === true;
      const replay = msg.replay !== false;
      meta.subscriptions[subject] = { consume, replay };
      this.setWsMeta(ws, meta);

      const queue = await this.getQueue();
      const pending = queue.filter((j) => j.status === "pending");

      this.wsSend(ws, {
        type: "subscribed",
        subject,
        consume,
        replay,
        pending: pending.length,
      });

      console.log(`[ws] ${meta.client_id} subscribed to "${subject}" consume=${consume} replay=${replay}`);

      if (replay && pending.length > 0) {
        if (consume) {
          await this.deliverPendingJobs();
        } else {
          for (const job of pending) {
            this.wsSend(ws, { type: "job", subject, ...this.jobPayload(job) });
          }
        }
      }

      this.ensureAlarm();
      return;
    }

    // --- UNSUBSCRIBE ---
    if (msgType === "unsubscribe") {
      const subject = msg.subject as string;
      if (subject) {
        delete meta.subscriptions[subject];
        this.setWsMeta(ws, meta);
        this.wsSend(ws, { type: "unsubscribed", subject });
      }
      return;
    }

    // --- ACK ---
    if (msgType === "ack") {
      const jobId = msg.job_id as string;
      const status = msg.status as "ok" | "error";

      if (!jobId || !status) {
        this.wsSend(ws, { type: "error", error: "job_id and status required" });
        return;
      }

      const job = await this.getJob(jobId);
      if (!job) {
        this.wsSend(ws, { type: "error", error: "job not found" });
        return;
      }

      if (job.claimed_by !== meta.client_id) {
        this.wsSend(ws, { type: "error", error: "not your job" });
        return;
      }

      const completion: JobCompletion = {
        client_id: meta.client_id,
        status,
        error: msg.error as string | undefined,
        result: msg.result as Record<string, unknown> | undefined,
        completed_at: new Date().toISOString(),
      };
      job.completions.push(completion);

      if (status === "ok") {
        job.status = "completed";
        console.log(`[job] ${jobId} completed by ${meta.client_id}`);
      } else if (msg.retry === true) {
        job.status = "pending";
        job.claimed_by = undefined;
        job.claimed_at = undefined;
        console.log(`[job] ${jobId} retry by ${meta.client_id}: ${msg.error}`);
      } else {
        job.status = "failed";
        console.log(`[job] ${jobId} failed at ${meta.client_id}: ${msg.error}`);
      }

      await this.saveJob(job);

      this.broadcastToObservers("wifi", {
        type: "job_update",
        subject: "wifi",
        job_id: jobId,
        status: job.status,
        completion,
      });

      return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const meta = this.getWsMeta(ws);
    if (meta?.client_id) {
      console.log(`[ws] ${meta.client_id} disconnected`);
      await this.releaseClaimedJobs(meta.client_id);
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ============================================================
  // ALARM (periodic sweep)
  // ============================================================

  async alarm(): Promise<void> {
    const now = Date.now();

    const queue = await this.getQueue();
    let releasedCount = 0;
    let expiredCount = 0;

    for (const job of queue) {
      const jobAge = now - new Date(job.created_at).getTime();

      // Expire old jobs (>12h)
      if (jobAge > JOB_EXPIRY_MS && (job.status === "pending" || job.status === "claimed")) {
        job.status = "expired";
        job.completions.push({
          client_id: "system",
          status: "error",
          error: `expired after ${Math.round(jobAge / 3600000)}h`,
          completed_at: new Date().toISOString(),
        });
        await this.saveJob(job);
        await this.removeFromQueue(job.id);
        expiredCount++;
        continue;
      }

      // Release stale claims (>120s)
      if (job.status === "claimed" && job.claimed_at) {
        const claimAge = now - new Date(job.claimed_at).getTime();
        if (claimAge > CLAIM_TIMEOUT_MS) {
          job.completions.push({
            client_id: job.claimed_by ?? "unknown",
            status: "error",
            error: `claim timeout (${Math.round(claimAge / 1000)}s)`,
            completed_at: new Date().toISOString(),
          });
          job.status = "pending";
          job.claimed_by = undefined;
          job.claimed_at = undefined;
          await this.saveJob(job);
          releasedCount++;
        }
      }
    }

    if (releasedCount > 0) {
      console.log(`[alarm] Released ${releasedCount} timed-out claims`);
      await this.deliverPendingJobs();
    }
    if (expiredCount > 0) {
      console.log(`[alarm] Expired ${expiredCount} old jobs`);
    }

    // Ping all clients
    const clients = this.getClients();
    for (const [clientId, { socket, meta }] of clients) {
      if (now - meta.last_pong > PING_INTERVAL_MS + PONG_TIMEOUT_MS) {
        console.log(`[ws] ${clientId} pong timeout, dropping`);
        await this.releaseClaimedJobs(clientId);
        try { socket.close(1000, "pong timeout"); } catch {}
        continue;
      }
      this.wsSend(socket, { type: "ping" });
    }

    // Re-arm if there are active jobs or connected clients
    const activeQueue = await this.getQueue();
    const hasWork = activeQueue.some((j) => j.status === "pending" || j.status === "claimed");
    if (hasWork || clients.size > 0) {
      this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
    }
  }

  // ============================================================
  // JOB DELIVERY
  // ============================================================

  private async deliverPendingJobs(): Promise<void> {
    const queue = await this.getQueue();
    const pending = queue.filter((j) => j.status === "pending");
    const clients = this.getClients();

    for (const job of pending) {
      let claimed = false;

      // Try to deliver to a consumer (first one wins)
      for (const [, { socket, meta }] of clients) {
        const sub = meta.subscriptions["wifi"];
        if (!sub?.consume) continue;

        job.status = "claimed";
        job.claimed_by = meta.client_id;
        job.claimed_at = new Date().toISOString();
        await this.saveJob(job);

        this.wsSend(socket, { type: "job", subject: "wifi", ...this.jobPayload(job) });
        console.log(`[deliver] ${job.id} -> ${meta.client_id} (${job.product_name})`);
        claimed = true;
        break;
      }

      // Send copy to all observers
      for (const [, { socket, meta }] of clients) {
        const sub = meta.subscriptions["wifi"];
        if (!sub || sub.consume) continue;
        this.wsSend(socket, { type: "job", subject: "wifi", ...this.jobPayload(job), observe: true });
      }

      if (!claimed) break;
    }
  }

  private async releaseClaimedJobs(clientId: string): Promise<void> {
    const queue = await this.getQueue();
    let released = 0;
    for (const job of queue) {
      if (job.status === "claimed" && job.claimed_by === clientId) {
        job.completions.push({
          client_id: clientId,
          status: "error",
          error: "client disconnected",
          completed_at: new Date().toISOString(),
        });
        job.status = "pending";
        job.claimed_by = undefined;
        job.claimed_at = undefined;
        await this.saveJob(job);
        released++;
      }
    }
    if (released > 0) {
      console.log(`[ws] Released ${released} jobs from ${clientId}`);
      await this.deliverPendingJobs();
    }
  }

  private jobPayload(job: PrintJob): Record<string, unknown> {
    return {
      job_id: job.id,
      receipt_id: job.receipt_id,
      duration_minutes: job.duration_minutes,
      devices: job.devices,
      product_name: job.product_name,
      created_at: job.created_at,
    };
  }

  private broadcastToObservers(subject: string, msg: Record<string, unknown>): void {
    for (const [, { socket, meta }] of this.getClients()) {
      const sub = meta.subscriptions[subject];
      if (sub && !sub.consume) {
        this.wsSend(socket, msg);
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private wsSend(ws: WebSocket, data: unknown): void {
    try { ws.send(JSON.stringify(data)); } catch {}
  }

  private ensureAlarm(): void {
    this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
  }

  private getClientSummaries(): Array<{ client_id: string; consume: boolean; subjects: string[]; connected_at: string }> {
    const result: Array<{ client_id: string; consume: boolean; subjects: string[]; connected_at: string }> = [];
    for (const [, { meta }] of this.getClients()) {
      const subs = Object.entries(meta.subscriptions);
      result.push({
        client_id: meta.client_id,
        consume: subs.some(([, s]) => s.consume),
        subjects: subs.map(([subj]) => subj),
        connected_at: meta.connected_at,
      });
    }
    return result;
  }

  // ============================================================
  // STORAGE
  // ============================================================

  private async storeEvent(event: WebhookLog): Promise<void> {
    await this.state.storage.put(`event:${event.id}`, event);
    const index = ((await this.state.storage.get("event_index")) as string[]) ?? [];
    index.unshift(event.id);
    if (index.length > 500) index.length = 500;
    await this.state.storage.put("event_index", index);

    const stats = await this.getStats();
    stats.total_events++;
    if (event.receipt_type === "SALE") stats.total_sales++;
    if (event.total_money) stats.total_revenue += event.total_money;
    stats.last_event_at = event.timestamp;
    await this.state.storage.put("stats", stats);
  }

  private async getEvents(limit = 50): Promise<WebhookLog[]> {
    const index = ((await this.state.storage.get("event_index")) as string[]) ?? [];
    const ids = index.slice(0, limit);
    if (ids.length === 0) return [];
    const entries = await this.state.storage.get(ids.map((id) => `event:${id}`));
    return ids.map((id) => entries.get(`event:${id}`) as WebhookLog).filter(Boolean);
  }

  private async enqueueJob(job: PrintJob): Promise<void> {
    await this.state.storage.put(`job:${job.id}`, job);
    const queue = ((await this.state.storage.get("job_queue")) as string[]) ?? [];
    queue.push(job.id);

    // Rolling cap: evict oldest completed/failed/expired first, then oldest pending
    while (queue.length > MAX_QUEUE_SIZE) {
      const jobs = await this.state.storage.get(queue.map((id) => `job:${id}`));
      const evictIdx = queue.findIndex((id) => {
        const j = jobs.get(`job:${id}`) as PrintJob | undefined;
        return j && (j.status === "completed" || j.status === "failed" || j.status === "expired");
      });
      const removeIdx = evictIdx >= 0 ? evictIdx : 0;
      const removedId = queue.splice(removeIdx, 1)[0];
      await this.state.storage.delete(`job:${removedId}`);
    }

    await this.state.storage.put("job_queue", queue);
  }

  private async getQueue(): Promise<PrintJob[]> {
    const queue = ((await this.state.storage.get("job_queue")) as string[]) ?? [];
    if (queue.length === 0) return [];
    const entries = await this.state.storage.get(queue.map((id) => `job:${id}`));
    return queue.map((id) => entries.get(`job:${id}`) as PrintJob).filter(Boolean);
  }

  private async getJob(jobId: string): Promise<PrintJob | undefined> {
    return (await this.state.storage.get(`job:${jobId}`)) as PrintJob | undefined;
  }

  private async saveJob(job: PrintJob): Promise<void> {
    await this.state.storage.put(`job:${job.id}`, job);
  }

  private async removeFromQueue(jobId: string): Promise<void> {
    const queue = ((await this.state.storage.get("job_queue")) as string[]) ?? [];
    const filtered = queue.filter((id) => id !== jobId);
    await this.state.storage.put("job_queue", filtered);
  }

  private async getStats(): Promise<{
    total_events: number;
    total_sales: number;
    total_revenue: number;
    last_event_at: string | null;
  }> {
    return (await this.state.storage.get("stats")) ?? {
      total_events: 0, total_sales: 0, total_revenue: 0, last_event_at: null,
    };
  }

  // ============================================================
  // API ENDPOINTS
  // ============================================================

  private async apiGetEvents(url: URL): Promise<Response> {
    const limit = Number(url.searchParams.get("limit") ?? 50);
    return Response.json({ events: await this.getEvents(limit) });
  }

  private async apiGetQueue(): Promise<Response> {
    const queue = await this.getQueue();
    return Response.json({ queue, count: queue.length });
  }

  private async apiGetStats(): Promise<Response> {
    return Response.json(await this.getStats());
  }

  private apiGetClients(): Response {
    const summaries = this.getClientSummaries();
    return Response.json({ clients: summaries, count: summaries.length });
  }

  private async apiCreateTestJob(): Promise<Response> {
    const job: PrintJob = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      receipt_id: `test-${Date.now()}`,
      duration_minutes: 30,
      devices: 1,
      product_name: "Test WiFi",
      status: "pending",
      completions: [],
    };
    await this.enqueueJob(job);
    await this.deliverPendingJobs();
    this.ensureAlarm();
    return Response.json({ ok: true, job });
  }

  private async apiClear(url: URL): Promise<Response> {
    const what = url.searchParams.get("what") ?? "all";
    if (what === "events" || what === "all") {
      const index = ((await this.state.storage.get("event_index")) as string[]) ?? [];
      for (const id of index) await this.state.storage.delete(`event:${id}`);
      await this.state.storage.put("event_index", []);
    }
    if (what === "queue" || what === "all") {
      const queue = ((await this.state.storage.get("job_queue")) as string[]) ?? [];
      for (const id of queue) await this.state.storage.delete(`job:${id}`);
      await this.state.storage.put("job_queue", []);
    }
    if (what === "all") {
      await this.state.storage.put("stats", { total_events: 0, total_sales: 0, total_revenue: 0, last_event_at: null });
    }
    return Response.json({ ok: true, cleared: what });
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
