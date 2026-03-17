/**
 * CloudFlare Durable Object WebSocket bridge client
 *
 * New protocol:
 *   1. Connect + auth with client_id
 *   2. Subscribe to "wifi" subject (consume=true for production, false for dry-run)
 *   3. Receive jobs, ack with result
 *
 * Auto-reconnects with exponential backoff.
 */

export interface BridgeConfig {
  url: string;
  secret: string;
  clientId: string;
  consume: boolean;  // true = production (claim jobs), false = observe only
}

export interface PrintJob {
  job_id: string;
  receipt_id?: string;
  duration_minutes: number;
  devices: number;
  product_name?: string;
  created_at?: string;
  observe?: boolean;  // true if we're just observing, not consuming
}

interface JobResult {
  status: "ok" | "error";
  error?: string;
  result?: Record<string, unknown>;
  retry?: boolean;
}

type JobHandler = (job: PrintJob) => Promise<JobResult>;

export class Bridge {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private keepaliveInterval: Timer | null = null;
  private onJob: JobHandler;
  private config: BridgeConfig;
  private running = false;
  private _connected = false;
  private _subscribed = false;

  constructor(config: BridgeConfig, onJob: JobHandler) {
    this.config = config;
    this.onJob = onJob;
  }

  start(): void {
    if (this.running) return;
    if (!this.config.url.startsWith("wss://")) {
      console.error(`[bridge] REFUSING to connect over insecure ${this.config.url} - use wss://`);
      return;
    }
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    this._connected = false;
    this._subscribed = false;
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected(): boolean { return this._connected; }
  get subscribed(): boolean { return this._subscribed; }

  private connect(): void {
    if (!this.running) return;

    console.log(`[bridge] Connecting to ${this.config.url} as "${this.config.clientId}"...`);

    try {
      this.ws = new WebSocket(this.config.url);
    } catch (err) {
      console.error(`[bridge] Connection failed: ${err}`);
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      console.log("[bridge] Connected, authenticating...");
      this.reconnectDelay = 1000;

      // Step 1: Authenticate
      this.send({
        type: "auth",
        secret: this.config.secret,
        client_id: this.config.clientId,
      });

      // Keepalive
      this.keepaliveInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({ type: "pong" });
        }
      }, 25000);
    });

    this.ws.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data));
        await this.handleMessage(msg);
      } catch (err) {
        console.error(`[bridge] Message parse error: ${err}`);
      }
    });

    this.ws.addEventListener("close", (event) => {
      console.log(`[bridge] Disconnected (code=${event.code} reason=${event.reason || "none"})`);
      this._connected = false;
      this._subscribed = false;
      this.cleanup();
      this.scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      console.error("[bridge] WebSocket error");
    });
  }

  private async handleMessage(msg: Record<string, unknown>): Promise<void> {
    const msgType = msg.type as string;

    // Auth response
    if (msgType === "auth_ok") {
      this._connected = true;
      console.log(`[bridge] Authenticated as "${msg.client_id}"`);

      // Step 2: Subscribe
      this.send({
        type: "subscribe",
        subject: "wifi",
        consume: this.config.consume,
        replay: true,
      });
      return;
    }

    if (msgType === "auth_error") {
      console.error(`[bridge] Auth failed: ${msg.error}`);
      return;
    }

    // Subscribe response
    if (msgType === "subscribed") {
      this._subscribed = true;
      console.log(`[bridge] Subscribed to "${msg.subject}" consume=${msg.consume} pending=${msg.pending}`);
      return;
    }

    // Ping from server
    if (msgType === "ping") {
      this.send({ type: "pong" });
      return;
    }

    // Job delivery
    if (msgType === "job") {
      const job: PrintJob = {
        job_id: msg.job_id as string,
        receipt_id: msg.receipt_id as string | undefined,
        duration_minutes: (msg.duration_minutes as number) ?? 60,
        devices: (msg.devices as number) ?? 1,
        product_name: msg.product_name as string | undefined,
        created_at: msg.created_at as string | undefined,
        observe: msg.observe as boolean | undefined,
      };

      // Observers just log
      if (job.observe || !this.config.consume) {
        console.log(`[bridge] [observe] Job ${job.job_id}: ${job.product_name} (${job.duration_minutes}min, ${job.devices}dev)`);
        return;
      }

      // Consumer: process and ack
      console.log(`[bridge] Job ${job.job_id}: ${job.product_name} (${job.duration_minutes}min, ${job.devices}dev)`);

      const result = await this.onJob(job);

      this.send({
        type: "ack",
        job_id: job.job_id,
        status: result.status,
        error: result.error,
        result: result.result,
        retry: result.retry,
      });

      return;
    }

    // Job status update (for observers)
    if (msgType === "job_update") {
      console.log(`[bridge] [update] Job ${msg.job_id}: ${msg.status}`);
      return;
    }

    // Error
    if (msgType === "error") {
      console.error(`[bridge] Server error: ${msg.error}`);
      return;
    }
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private cleanup(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    console.log(`[bridge] Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }
}
