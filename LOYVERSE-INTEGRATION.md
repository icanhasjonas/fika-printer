# Loyverse POS Integration - Automated WiFi Voucher Printing

> Research date: 2026-02-23\
> Purpose: Automate WiFi voucher printing via POS sale trigger -- no physical buttons needed\
> Maintained by GLaDOS - "The WiFi is a lie. But the voucher code is real."

---

## TL;DR - The Buttonless Approach

Instead of physical buttons, use the existing **Loyverse POS** at FIKA to trigger
WiFi voucher printing. Staff "sells" a WiFi pass item in the POS, Loyverse fires
a webhook, your listener generates a UniFi voucher, and a network printer spits
out the receipt. Zero hardware to build.

```
┌────────────────┐  webhook    ┌─────────────────┐HTTPS    ┌──────────────┐
│ Loyverse POS   │──────────────►│ Your Listener │───────────►│ UniFi API │
│ (iPad/tablet)  │             │ (Bun/Worker)    │         │ 172.21.7.1   │
│                │             │                 │         └──────────────┘
│ Staff taps     │             │ Parse receipt   │
│ "WiFi 1-Day"   │             │ Generate code   │ ESC/POS  ┌──────────────┐─┐
│                │             │ Format receipt  │───────────►│ Network     │
└────────────────┘             └─────────────────┘CP/9100   │ Printer       │
                                                            └───────────────┘
```

---

## Why This Is Interesting

| | Button Box | Loyverse Integration |
|---|---|---|
| **Hardware to build** | ESP32 + printer + buttons + enclosure | Nothing (printer on LAN) |
| **Staff workflow** | Walk to button box, press button | Tap in POS they already use |
| **Tracking** | None (or serial debug) | Full sales history in Loyverse |
| **Revenue** | Can't charge for WiFi | Can price WiFi passes (1 THB or real price) |
| **Analytics** | Manual counting | Loyverse reports -- how many passes/day, revenue |
| **Multiple locations** | One box per location | One webhook listener, any Loyverse POS |

---

## Loyverse Overview

### What Is It?

Free cloud POS system. Very popular with small restaurants and coffee shops in
Southeast Asia. Runs on iPad/Android tablet.

### Pricing

| Component | Cost |
|-----------|------|
| **Loyverse POS app** | FREE |
| **Loyverse Dashboard (Back Office)** | FREE |
| **API Access (tokens, webhooks)** | FREE |
| **Loyverse KDS (kitchen display)** | FREE |
| Employee Management | $5/mo per employee |
| Advanced Inventory | $25/mo per store |

**The stuff we need (POS + API + webhooks) is all free.**

### Supported Printers

Loyverse POS natively prints to:
- **Sunmi** built-in printers (V2, V2s, etc.)
- **Star** printers (mPOP, TSP654IILAN)
- **Epson** ESC/POS printers via LAN
- Various Bluetooth/USB thermal printers

**But we're NOT printing from Loyverse.** Loyverse prints the normal sale receipt.
Our listener generates a SEPARATE voucher print job to a different printer (or
the same one, via ESC/POS over TCP).

---

## The API

### Authentication

Bearer token from Back Office > Settings > Access Tokens.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.loyverse.com/v1.0/receipts
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1.0/receipts` | GET | List receipts (paid only!) |
| `/v1.0/receipts/{id}` | GET | Get receipt with line items |
| `/v1.0/items` | GET | List items/products |
| `/v1.0/variants` | GET | List item variants |
| `/v1.0/customers` | GET | List customers |
| `/v1.0/webhooks` | POST | Create webhook subscription |
| `/v1.0/webhooks` | GET | List active webhooks |

**Docs:** [developer.loyverse.com/docs](https://developer.loyverse.com/docs/)

### Creating a Webhook

```bash
curl -X POST https://api.loyverse.com/v1.0/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "receipts",
    "url": "https://your-worker.fika.workers.dev/loyverse-webhook",
    "status": "ACTIVE"
  }'
```

Or via the dashboard: `https://r.loyverse.com/dashboard/#/webhooks`

### Webhook Event Types

| Event | Trigger |
|-------|---------|
| `receipts` | Receipt created or updated |
| `customers` | Customer created/updated/deleted |
| `items` | Item/product updated |
| `inventory` | Stock level changes |
| `shifts` | Shift closes and syncs |

### Webhook Behavior

- **Retries:** 200 retries over 48 hours if endpoint returns non-2xx
- **Auto-disable:** Webhook gets disabled after 200 failures, email notification sent
- **Signature:** `X-Loyverse-Signature` header included when webhook is created via OAuth 2.0 (not with Access Token)
- **Latency:** 2-10 seconds from sale to webhook delivery (typical for cloud POS)

---

## The $0 Item Problem

> **CRITICAL:** Loyverse API FAQ states it can only return **paid receipts**.

If you create a $0 "WiFi Pass" item and "sell" it for free, the webhook might
not fire because Loyverse might not consider it a "paid" receipt.

### Workarounds

| Approach | Risk | Recommendation |
|----------|------|----------------|
| Price at **1 THB** | None - trivial cost, definitely triggers | **Recommended** |
| Price at real cost (50-100 THB) | None - actual revenue | Good for premium WiFi |
| $0 with $0 cash payment | Unknown - needs testing | Test first |
| Different trigger (manual API call) | More complex | Fallback option |

**Best approach:** Create three items in Loyverse:

| Item Name | Price | Variant ID | Voucher Duration |
|-----------|-------|------------|-----------------|
| WiFi 1-Day Pass | 1 THB | (note the ID) | 1440 min |
| WiFi 1-Week Pass | 1 THB | (note the ID) | 10080 min |
| WiFi 1-Month Pass | 1 THB | (note the ID) | 43200 min |

Staff taps the item, processes as cash sale (1 THB), webhook fires, voucher prints.
The 1 THB is a rounding error but guarantees the system works.

---

## Architecture Options

### Option A: Cloudflare Worker (Recommended)

Your webhook listener runs on Cloudflare Workers. Free tier, zero maintenance,
globally distributed.

```
Loyverse POS ──► Loyverse Cloud ──► CF Worker ──► UniFi API (172.21.7.1)
                                        │
                                        ▼
                                   Network Printer (TCP/9100)
```

**Problem:** The UniFi controller is on a local network (172.21.7.1). A Cloudflare
Worker can't reach it unless you expose it via Tailscale Funnel or similar.

**Also problem:** The thermal printer is also on local LAN. Can't reach from a
CF Worker.

### Option B: Local Listener on RPi/ESP32 (Practical)

Run a small Bun/Node server on a Raspberry Pi (or even an ESP32 with HTTP server)
on the FIKA LAN. Loyverse webhook hits it directly (via port forwarding or
Tailscale Funnel for the webhook URL).

```
Loyverse Cloud ──► Tailscale Funnel ──► RPi on FIKA LAN
                                            │
                                            ├──► UniFi API (172.21.7.1)
                                            │
                                            └──► Printer (TCP/9100 on LAN)
```

**This is the cleanest approach.** Everything stays on the local network except
the webhook ingress.

### Option C: Cloudflare Worker + MQTT Bridge

Worker receives webhook, publishes to MQTT broker, ESP32/RPi on LAN subscribes
and handles printing.

```
Loyverse Cloud ──► CF Worker ──► MQTT Broker (cloud)
                                      │
                                      ▼ (subscribe)
                                 ESP32/RPi on FIKA LAN
                                      │
                                      ├──► UniFi API
                                      └──► Printer (TCP/9100)
```

More complex but decouples the webhook endpoint from the local network.

### Option D: Sunmi V2 as Both POS and Printer

If FIKA uses a Sunmi V2 as the Loyverse POS device, you could:
1. Run Loyverse POS on the Sunmi V2
2. Run your voucher app as a background service on the SAME device
3. When Loyverse creates a receipt, your service detects it (via webhook or local polling)
4. Your service calls UniFi API and prints the voucher on the BUILT-IN printer
5. One device does everything!

This requires the Sunmi V2 to be the POS device, which it already can be
(Loyverse has native Sunmi support).

---

## Webhook Listener Implementation

### Bun/TypeScript (for RPi or local server)

```typescript
import { serve } from "bun";

const UNIFI_URL = "https://172.21.7.1";
const UNIFI_API_KEY = process.env.UNIFI_API_KEY;
const PRINTER_IP = "192.168.1.100";
const PRINTER_PORT = 9100;

// Map Loyverse item variant IDs to voucher durations
const WIFI_ITEMS: Record<string, { duration: number; label: string }> = {
  "variant-id-1-day": { duration: 1440, label: "1 day" },
  "variant-id-1-week": { duration: 10080, label: "1 week" },
  "variant-id-1-month": { duration: 43200, label: "1 month" },
};

serve({
  port: 3847,
  async fetch(req) {
    if (req.method !== "POST") return new Response("OK");

    const body = await req.json();

    // Extract line items from receipt
    for (const item of body.line_items ?? []) {
      const wifi = WIFI_ITEMS[item.variant_id];
      if (!wifi) continue;

      // Found a WiFi pass item -- generate voucher
      const code = await createUniFiVoucher(wifi.duration);
      await printVoucher(code, wifi.label);
    }

    return new Response("OK", { status: 200 });
  },
});

async function createUniFiVoucher(expireMinutes: number): Promise<string> {
  // Step 1: Create voucher
  const createRes = await fetch(
    `${UNIFI_URL}/proxy/network/api/s/default/cmd/hotspot`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": UNIFI_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cmd: "create-voucher",
        expire: expireMinutes,
        n: 1,
        quota: 1,
        note: `FIKA WiFi - Loyverse sale`,
      }),
      // @ts-ignore - self-signed cert
      tls: { rejectUnauthorized: false },
    }
  );
  const createData = await createRes.json();
  const createTime = createData.data[0].create_time;

  // Step 2: Fetch voucher code
  const statRes = await fetch(
    `${UNIFI_URL}/proxy/network/api/s/default/stat/voucher`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": UNIFI_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ create_time: createTime }),
      // @ts-ignore
      tls: { rejectUnauthorized: false },
    }
  );
  const statData = await statRes.json();
  return statData.data[0].code; // "XXXXX-XXXXX"
}

async function printVoucher(code: string, label: string) {
  const sock = await Bun.connect({
    hostname: PRINTER_IP,
    port: PRINTER_PORT,
    socket: {
      data() {},
      open(socket) {
        // ESC/POS: Initialize
        socket.write(Buffer.from([0x1b, 0x40]));

        // Center align
        socket.write(Buffer.from([0x1b, 0x61, 0x01]));

        // Bold on
        socket.write(Buffer.from([0x1b, 0x45, 0x01]));
        socket.write(Buffer.from("FIKA WiFi\n"));
        socket.write(Buffer.from([0x1b, 0x45, 0x00]));

        // QR code (native ESC/POS)
        const qrData = `WIFI:T:WPA;S:FIKA-Guest;P:${code};;`;
        const qrLen = qrData.length + 3;
        socket.write(
          Buffer.from([
            0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00, // Model 2
            0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x08, // Size 8
            0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31, // EC level M
            0x1d,
            0x28,
            0x6b,
            qrLen & 0xff,
            (qrLen >> 8) & 0xff,
            0x31,
            0x50,
            0x30, // Store data
          ])
        );
        socket.write(Buffer.from(qrData));
        socket.write(
          Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30])
        ); // Print QR

        // Voucher code as text
        socket.write(Buffer.from(`\nCODE: ${code}\n`));
        socket.write(Buffer.from(`VALID: ${label}\n\n`));

        // Cut (if auto-cutter)
        socket.write(Buffer.from([0x1d, 0x56, 0x00]));

        socket.end();
      },
      close() {},
      error() {},
    },
  });
}

console.log("Loyverse webhook listener running on :3847");
```

---

## Setup Checklist

### In Loyverse Back Office

- [ ] Create items: "WiFi 1-Day Pass" (1 THB), "WiFi 1-Week Pass" (1 THB), "WiFi 1-Month Pass" (1 THB)
- [ ] Note the variant IDs for each item (from API: `GET /v1.0/items`)
- [ ] Create an Access Token (Settings > Access Tokens)
- [ ] Create a webhook subscription for `receipts` event type
- [ ] Point webhook URL to your listener (via Tailscale Funnel or port forward)

### On FIKA LAN

- [ ] Set up Raspberry Pi or similar with Bun installed
- [ ] Configure listener with UniFi API key and printer IP
- [ ] Connect a network thermal printer (ESC/POS, TCP port 9100)
- [ ] Test: sell a "WiFi 1-Day Pass" in Loyverse, verify voucher prints
- [ ] Set up Tailscale Funnel for webhook ingress (or use MQTT bridge)

### On UniFi Controller

- [ ] Same setup as button approach -- see [UNIFI-VOUCHER-API.md](UNIFI-VOUCHER-API.md)
- [ ] Local admin user with API key
- [ ] Guest SSID "FIKA-Guest" with hotspot/voucher auth

---

## Comparison: All Three Approaches

| | Button Box (ESP32) | Sunmi V2 (Android) | Loyverse (Webhook) |
|---|---|---|---|
| **Hardware to build** | Full DIY | Buy used device | Just a network printer |
| **Physical buttons** | 3 GPIO buttons | Vol Up/Down + screen | None (POS is the UI) |
| **Staff workflow** | Walk to box, press button | Walk to device, press button | Tap in POS they already use |
| **Cost** | $30-50 | $60-120 | $40-150 (printer only) |
| **Time to deploy** | 1-3 weeks | 1-3 days | 1-2 days |
| **Revenue tracking** | None | None | Full Loyverse reports |
| **WiFi passes sold** | No tracking | No tracking | Per-item sales data |
| **Multi-location** | One box per location | One device per location | One listener, any POS |
| **Auto-cutter** | Yes ($35-50) | No | Depends on printer |
| **Maintenance** | Arduino OTA | ADB updates | Server + printer |
| **Dependencies** | None (standalone) | None (standalone) | Internet + Loyverse cloud |

---

## Open Questions (Need Real-World Testing)

1. **Does a 1 THB receipt fire the webhook?** (Should be yes, but test it)
2. **Does a $0 receipt fire the webhook?** (Probably not -- Loyverse says "paid receipts only")
3. **What exactly is in the webhook payload?** (Set up webhook.site listener and sell a test item)
4. **Are line items included in the webhook, or just a receipt ID?** (Need to check)
5. **Can we use both Loyverse receipt printing AND voucher printing on the same Sunmi V2?** (Should work -- two separate print jobs)

---

## Cross-References

- [README.md](README.md) -- Project overview, all approaches
- [ANDROID-PRINTER-RESEARCH.md](ANDROID-PRINTER-RESEARCH.md) -- Sunmi V2 and Android POS devices
- [PRINTER-RESEARCH.md](PRINTER-RESEARCH.md) -- Bare thermal printer modules (ESP32 DIY)
- [SHOPPING-GUIDE.md](SHOPPING-GUIDE.md) -- Where to buy everything
- [UNIFI-VOUCHER-API.md](UNIFI-VOUCHER-API.md) -- UniFi voucher API docs

---

## Loyverse Developer Resources

| Resource | URL |
|----------|-----|
| API Documentation | [developer.loyverse.com/docs](https://developer.loyverse.com/docs/) |
| API Overview | [loyverse.com/loyverse-pos-api](https://loyverse.com/loyverse-pos-api) |
| Access Token Setup | [help.loyverse.com/help/loyverse-api](https://help.loyverse.com/help/loyverse-api) |
| Webhook Dashboard | [r.loyverse.com/dashboard/#/webhooks](https://r.loyverse.com/dashboard/#/webhooks) |
| Supported Printers | [help.loyverse.com/help/supported-printers](https://help.loyverse.com/help/supported-printers) |
| Sunmi Integration | [help.loyverse.com/help/connecting-built-printers-sunmi](https://help.loyverse.com/help/connecting-built-printers-sunmi) |
| API FAQ | [support.loyverse.com/en/articles/8061203](https://support.loyverse.com/en/articles/8061203-faqs-about-loyverse-api) |
| Community Forum | [loyverse.town](https://loyverse.town/) |
| Python SDK | [github.com/matteobe/loyverse](https://github.com/matteobe/loyverse) |
| PHP SDK | [github.com/siarheipashkevich/loyverse-sdk](https://github.com/siarheipashkevich/loyverse-sdk) |
