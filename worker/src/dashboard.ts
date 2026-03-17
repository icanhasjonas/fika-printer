/**
 * Dashboard HTML renderer - hacker terminal aesthetic
 */

interface WebhookLog {
  id: string;
  timestamp: string;
  type: string;
  raw: unknown;
  receipt_number?: string;
  receipt_type?: string;
  total_money?: number;
  items?: string[];
}

interface PrintJob {
  id: string;
  created_at: string;
  receipt_id?: string;
  duration_minutes: number;
  devices: number;
  product_name?: string;
  status: string;
  voucher_code?: string;
  error?: string;
}

interface Stats {
  total_events: number;
  total_sales: number;
  total_revenue: number;
  last_event_at: string | null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    pending: "#f59e0b",
    sent: "#3b82f6",
    printed: "#10b981",
    error: "#ef4444",
    SALE: "#10b981",
    REFUND: "#ef4444",
  };
  const color = colors[status] ?? "#6b7280";
  return `<span style="background:${color};color:#000;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:bold">${escapeHtml(status)}</span>`;
}

interface ClientSummary {
  client_id: string;
  consume: boolean;
  subjects: string[];
  connected_at: string;
}

export function renderDashboard(events: WebhookLog[], queue: PrintJob[], stats: Stats, clients?: ClientSummary[]): string {
  const eventsHtml = events.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#666">No events yet. Configure Loyverse webhook to start.</td></tr>'
    : events.map((e) => `
      <tr>
        <td style="color:#666">${timeAgo(e.timestamp)}</td>
        <td>${escapeHtml(e.type)}</td>
        <td>${e.receipt_number ? escapeHtml(e.receipt_number) : "-"} ${e.receipt_type ? statusBadge(e.receipt_type) : ""}</td>
        <td style="text-align:right">${e.total_money != null ? `฿${e.total_money.toFixed(2)}` : "-"}</td>
        <td style="color:#666;font-size:11px">${e.items ? escapeHtml(e.items.slice(0, 3).join(", ")) + (e.items.length > 3 ? "..." : "") : "-"}</td>
      </tr>`).join("\n");

  const queueHtml = queue.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#666">Queue empty</td></tr>'
    : queue.map((j) => `
      <tr>
        <td style="color:#666">${timeAgo(j.created_at)}</td>
        <td>${j.receipt_id ? escapeHtml(j.receipt_id) : "test"}</td>
        <td>${statusBadge(j.status)}</td>
        <td>${j.voucher_code ? `<code>${escapeHtml(j.voucher_code)}</code>` : j.error ? `<span style="color:#ef4444">${escapeHtml(j.error)}</span>` : "-"}</td>
      </tr>`).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FIKA Print Queue</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      color: #e0e0e0;
      font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
      font-size: 13px;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #10b981;
      font-size: 18px;
      margin-bottom: 4px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 20px;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat {
      background: #111;
      border: 1px solid #222;
      border-radius: 6px;
      padding: 12px 16px;
      min-width: 140px;
    }
    .stat-label { color: #666; font-size: 11px; text-transform: uppercase; }
    .stat-value { color: #10b981; font-size: 22px; font-weight: bold; margin-top: 4px; }
    .stat-value.warn { color: #f59e0b; }
    h2 {
      color: #10b981;
      font-size: 14px;
      margin: 20px 0 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      text-align: left;
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 1px solid #222;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #111;
      vertical-align: top;
    }
    tr:hover td { background: #111; }
    code {
      background: #1a1a1a;
      padding: 1px 4px;
      border-radius: 2px;
      color: #10b981;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    button, .btn {
      background: #1a1a1a;
      color: #e0e0e0;
      border: 1px solid #333;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    button:hover, .btn:hover { background: #222; border-color: #10b981; }
    .btn-danger:hover { border-color: #ef4444; }
    .raw-toggle {
      color: #666;
      cursor: pointer;
      text-decoration: underline;
      font-size: 11px;
    }
    .raw-json {
      display: none;
      background: #111;
      padding: 8px;
      margin-top: 4px;
      border-radius: 4px;
      max-height: 200px;
      overflow: auto;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .banner {
      border: 1px solid #222;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 6px;
      background: #0d0d0d;
    }
    .banner pre {
      color: #10b981;
      font-size: 11px;
      line-height: 1.3;
    }
    @media (max-width: 600px) {
      body { padding: 10px; font-size: 12px; }
      .stats { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="banner">
    <pre>
 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 ┃  FIKA WiFi Code Printer            ┃
 ┃  Loyverse Integration Dashboard    ┃
 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛</pre>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Events</div>
      <div class="stat-value">${stats.total_events}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Sales</div>
      <div class="stat-value">${stats.total_sales}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Revenue</div>
      <div class="stat-value">฿${stats.total_revenue.toFixed(0)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Queue</div>
      <div class="stat-value${queue.length > 0 ? " warn" : ""}">${queue.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Last Event</div>
      <div class="stat-value" style="font-size:13px">${stats.last_event_at ? timeAgo(stats.last_event_at) : "never"}</div>
    </div>
  </div>

  <div class="actions">
    <button onclick="sendTest()">Send Test Webhook</button>
    <button onclick="createTestJob()">Create Test Job</button>
    <button onclick="location.reload()">Refresh</button>
    <button class="btn-danger" onclick="clearAll()">Clear All</button>
  </div>

  <h2>Connected Clients</h2>
  <table>
    <tr><th>Client ID</th><th>Mode</th><th>Subjects</th><th>Connected</th></tr>
    ${(clients && clients.length > 0) ? clients.map((c) => `
      <tr>
        <td><code>${escapeHtml(c.client_id)}</code></td>
        <td>${c.consume ? statusBadge("CONSUMER") : statusBadge("OBSERVER")}</td>
        <td>${c.subjects.map((s) => escapeHtml(s)).join(", ") || "-"}</td>
        <td style="color:#666">${timeAgo(c.connected_at)}</td>
      </tr>`).join("\n") : '<tr><td colspan="4" style="text-align:center;color:#666">No clients connected</td></tr>'}
  </table>

  <h2>Print Queue</h2>
  <table>
    <tr><th>When</th><th>Receipt</th><th>Status</th><th>Result</th></tr>
    ${queueHtml}
  </table>

  <h2>Webhook Events (latest ${events.length})</h2>
  <table>
    <tr><th>When</th><th>Type</th><th>Receipt</th><th>Total</th><th>Items</th></tr>
    ${eventsHtml}
  </table>

  <h2>Debug</h2>
  <p style="color:#666;margin-bottom:8px">
    Webhook URL: <code>/webhook/loyverse</code>
  </p>
  <p style="color:#666">
    API: <code>/api/events</code> | <code>/api/queue</code> | <code>/api/stats</code>
  </p>

  <script>
    async function sendTest() {
      const res = await fetch('/webhook/loyverse', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          merchant_id: 'test-merchant',
          type: 'receipts.update',
          created_at: new Date().toISOString(),
          receipts: [{
            receipt_number: 'TEST-' + Date.now(),
            receipt_type: 'SALE',
            total_money: 150.00,
            store_id: 'test-store',
            line_items: [
              {item_name: 'Latte', quantity: 1, price: 80},
              {item_name: 'Croissant', quantity: 1, price: 70}
            ],
            payments: [{type: 'CASH', money_amount: 150}]
          }]
        })
      });
      const data = await res.json();
      alert('Test webhook sent! Event ID: ' + data.event_id);
      location.reload();
    }

    async function createTestJob() {
      await fetch('/api/test-job', {method: 'POST'});
      location.reload();
    }

    async function clearAll() {
      if (!confirm('Clear all events and queue?')) return;
      await fetch('/api/clear?what=all', {method: 'POST'});
      location.reload();
    }
  </script>
</body>
</html>`;
}
