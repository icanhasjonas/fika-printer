/**
 * FIKA Loyverse Integration Worker
 *
 * Receives Loyverse webhooks, stores raw JSON for debugging,
 * queues print jobs, and provides a web UI to view everything.
 */

export interface Env {
  PRINT_QUEUE: DurableObjectNamespace;
  WS_SECRET: string;
  WEBHOOK_SECRET?: string;
  DASHBOARD_USER?: string;
  DASHBOARD_PASS?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route to Durable Object for all state management
    const id = env.PRINT_QUEUE.idFromName("singleton");
    const stub = env.PRINT_QUEUE.get(id);

    return stub.fetch(request);
  },
};

// Re-export Durable Object
export { PrintQueue } from "./print-queue";
