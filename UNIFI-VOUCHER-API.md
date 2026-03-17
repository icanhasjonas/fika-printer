# UniFi Voucher API Research

> Research date: 2026-02-23\
> Purpose: Programmatic WiFi guest voucher creation via UniFi Dream Machine API\
> Controller: UDM at `https://172.20.7.1`

---

## TL;DR - The Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Authenticate (cookie or x-api-key)                              │
│  2. POST /proxy/network/api/s/default/cmd/hotspot                   │
│     { "cmd": "create-voucher", "expire": 1440, "n": 1 }             │
│  3. Response gives you create_time                                  │
│  4. POST /proxy/network/api/s/default/stat/voucher                  │
│     { "create_time": <timestamp> }                                  │
│  5. Response has the actual voucher code (e.g. "38495-29174")       │
│  6. Print on thermal printer, done                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Important:** Creating a voucher does NOT return the code directly. You get a `create_time` timestamp, then query `stat/voucher` with that timestamp to retrieve the actual voucher code(s). Two-step process.

---

## 1. Authentication

### Method A: API Key (Preferred for ESP32)

UDM firmware supports `X-API-KEY` header authentication. This is stateless - no cookie management needed. Perfect for embedded devices.

**Generate the key:**
1. UniFi Network > Control Plane > Admins & Users
2. Select your admin user
3. Click "Create API Key"
4. Copy the key (shown only once)

**Usage:**
```bash
curl -k -H "X-API-KEY: your-api-key-here" \
  https://172.20.7.1/proxy/network/api/s/default/stat/voucher
```

**Limitations:**
- Only works for the admin user who created it
- Generated locally only (not cloud)
- No read-only keys available
- Must be a **local-only user** (Ubiquiti cloud accounts won't work)

You already have `UNIFI_API_KEY` in `~/.secrets` - that should work if it was generated for a local admin with hotspot privileges.

### Method B: Cookie Auth (Traditional)

```bash
# Login and save cookie
curl -k -c /tmp/unifi-cookie -b /tmp/unifi-cookie \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  https://172.20.7.1/api/auth/login

# Use cookie for subsequent requests
curl -k -b /tmp/unifi-cookie \
  https://172.20.7.1/proxy/network/api/s/default/stat/voucher
```

**Notes:**
- UDM login endpoint is `/api/auth/login` (NOT `/api/login` which is for standalone controllers)
- Session cookies expire - need refresh logic for long-running services
- Must be a **local-only user** - cloud/Ubiquiti SSO accounts will NOT work
- User needs **super admin, site admin, or hotspot privileges**

### Method C: CSRF Token (UDM-specific gotcha)

Some UDM firmware versions require a CSRF token for POST requests when using cookie auth. The token comes back in the login response as `x-csrf-token` header:

```bash
# Login, capture CSRF token
CSRF=$(curl -k -c /tmp/unifi-cookie -b /tmp/unifi-cookie \
  -X POST -D - \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  https://172.20.7.1/api/auth/login 2>/dev/null | grep -i x-csrf-token | awk '{print $2}' | tr -d '\r')

# Use both cookie AND CSRF token
curl -k -b /tmp/unifi-cookie \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"cmd":"create-voucher","expire":1440,"n":1}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot
```

**API key auth bypasses this entirely** - another reason to prefer it.

---

## 2. API Endpoints

### UDM Path Prefix

All Network Application API endpoints on UDM/UDM Pro/UCG need the `/proxy/network` prefix:

| Device Type | Base URL |
|-------------|----------|
| Standalone controller | `https://host:8443/api/s/{site}/...` |
| UDM / UDM Pro / UCG | `https://host/proxy/network/api/s/{site}/...` |

Your site is almost certainly `default` unless you've created multiple sites.

### Voucher Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create voucher(s) | POST | `/proxy/network/api/s/default/cmd/hotspot` |
| List vouchers | POST | `/proxy/network/api/s/default/stat/voucher` |
| Revoke voucher | POST | `/proxy/network/api/s/default/cmd/hotspot` |

### Create Voucher - Payload

```json
{
  "cmd": "create-voucher",
  "expire": 1440,
  "n": 1,
  "quota": 1,
  "note": "Guest WiFi",
  "up": null,
  "down": null,
  "bytes": null
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cmd` | string | YES | Must be `"create-voucher"` |
| `expire` | int | YES | Validity duration in **minutes** after activation |
| `n` | int | YES | Number of vouchers to create |
| `quota` | int | NO | `0` = unlimited use, `1` = single-use, `N` = N-times use |
| `note` | string | NO | Label/description for the voucher |
| `up` | int | NO | Upload speed limit in **kbps** |
| `down` | int | NO | Download speed limit in **kbps** |
| `bytes` | int | NO | Data transfer limit in **MB** |

### Create Voucher - Response

```json
{
  "meta": {
    "rc": "ok"
  },
  "data": [
    {
      "create_time": 1708700000
    }
  ]
}
```

The response ONLY gives you `create_time`. You need this to fetch the actual voucher code.

### Stat/List Vouchers - Payload

```json
{
  "create_time": 1708700000
}
```

Pass `create_time` to filter. Omit the body (or send `{}`) to get ALL vouchers.

### Stat/List Vouchers - Response

```json
{
  "meta": {
    "rc": "ok"
  },
  "data": [
    {
      "_id": "65d8f1234567890abcdef01",
      "site_id": "default",
      "create_time": 1708700000,
      "code": "38495-29174",
      "quota": 1,
      "duration": 1440,
      "used": 0,
      "for_hotspot": true,
      "admin_name": "admin",
      "note": "Guest WiFi",
      "qos_overwrite": false,
      "status": "VALID_ONE"
    }
  ]
}
```

**Key fields:**
- `code` - The actual voucher code guests type in (format: `XXXXX-XXXXX`, 10 digits with dash)
- `_id` - Internal ID needed for revoking
- `duration` - Expiry in minutes
- `used` - Number of times used
- `status` - `VALID_ONE` (single-use), `VALID_MULTI` (multi-use)

### Revoke/Delete Voucher - Payload

```json
{
  "cmd": "delete-voucher",
  "_id": "65d8f1234567890abcdef01"
}
```

---

## 3. Working curl Examples

All examples use API key auth. Replace `YOUR_API_KEY` with your actual key.

### Authenticate and Test

```bash
# Test API key works
curl -sk -H "X-API-KEY: YOUR_API_KEY" \
  https://172.20.7.1/proxy/network/api/s/default/self | jq .meta.rc
# Should return: "ok"
```

### Create a 1-Day Voucher (Single-Use)

```bash
# Step 1: Create
CREATE_TIME=$(curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"create-voucher","expire":1440,"n":1,"quota":1,"note":"1-day guest"}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot \
  | jq -r '.data[0].create_time')

echo "Create time: $CREATE_TIME"

# Step 2: Fetch the voucher code
curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"create_time\": $CREATE_TIME}" \
  https://172.20.7.1/proxy/network/api/s/default/stat/voucher \
  | jq -r '.data[0].code'
# Output: "38495-29174" (example)
```

### Create a 1-Week Voucher

```bash
curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"create-voucher","expire":10080,"n":1,"quota":0,"note":"1-week guest"}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot
# 10080 = 7 * 24 * 60 minutes
```

### Create a 1-Month Voucher (30 days)

```bash
curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"create-voucher","expire":43200,"n":1,"quota":0,"note":"1-month guest"}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot
# 43200 = 30 * 24 * 60 minutes
```

### Create Voucher with Bandwidth Limits

```bash
curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"create-voucher","expire":1440,"n":1,"quota":1,"note":"Limited guest","up":5000,"down":10000,"bytes":1024}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot
# up: 5 Mbps upload, down: 10 Mbps download, bytes: 1 GB data cap
```

### List All Vouchers

```bash
curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://172.20.7.1/proxy/network/api/s/default/stat/voucher | jq .
```

### Revoke a Voucher

```bash
# First, find the voucher _id from stat/voucher response
curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"delete-voucher","_id":"65d8f1234567890abcdef01"}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot
```

### One-Liner: Create and Get Code

```bash
# Create voucher and immediately fetch the code
CODE=$(curl -sk \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"create-voucher","expire":1440,"n":1,"quota":1,"note":"auto"}' \
  https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot \
  | jq -r '.data[0].create_time' \
  | xargs -I{} curl -sk \
    -H "X-API-KEY: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"create_time":{}}' \
    https://172.20.7.1/proxy/network/api/s/default/stat/voucher \
  | jq -r '.data[0].code')

echo "Voucher code: $CODE"
```

---

## 4. Guest Network / Hotspot Setup Requirements

For vouchers to work, the UniFi controller needs specific configuration:

### Required Setup

1. **Create a Guest SSID**
   - UniFi Network > WiFi > Create New
   - Set "Network Type" or "Usage" to **Guest**
   - This creates an isolated guest network with client isolation

2. **Enable Hotspot Portal**
   - UniFi Network > Hotspot > Hotspot Portal
   - Enable the portal
   - Set Authentication to **Voucher** (or "Hotspot" with voucher option)

3. **Associate the Guest SSID with the Portal**
   - The guest SSID should be set to use the hotspot portal
   - Under WiFi settings > Security, set to "Open" or "WPA" (the voucher is the auth, not the WiFi password)
   - Some setups use an open SSID with voucher-only access

4. **Guest Control Settings**
   - UniFi Network > Settings > Guest Control
   - Configure pre-authorization access (what guests can reach before entering a voucher)
   - Typically allow DNS and the captive portal redirect

### How It Works for Guests

```
┌─────────────────────────────────────────────────────────────┐
│  1. Guest connects to "Guest WiFi" SSID                     │
│  2. Opens browser -> captive portal redirect                │
│  3. Portal shows voucher entry form                         │
│  4. Guest enters code: 38495-29174                          │
│  5. Controller validates, grants internet access            │
│  6. Timer starts (e.g. 24 hours from NOW, not creation)     │
└─────────────────────────────────────────────────────────────┘
```

**Critical detail:** The `expire` timer starts when the guest **activates** the voucher (enters it), NOT when it was created. So you can pre-generate vouchers.

---

## 5. ESP32 Implementation Notes

### HTTPS with Self-Signed Certificate

The UDM serves a self-signed certificate by default. The ESP32 needs to skip certificate verification.

**Arduino Framework (WiFiClientSecure):**

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* UNIFI_HOST = "172.20.7.1";
const char* API_KEY = "your-api-key-here";

String createVoucher(int expireMinutes) {
    WiFiClientSecure client;
    client.setInsecure();  // Skip SSL cert verification (self-signed)

    HTTPClient http;

    // Step 1: Create voucher
    String createUrl = "https://" + String(UNIFI_HOST)
        + "/proxy/network/api/s/default/cmd/hotspot";

    http.begin(client, createUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", API_KEY);

    String createPayload = "{\"cmd\":\"create-voucher\","
        "\"expire\":" + String(expireMinutes) + ","
        "\"n\":1,\"quota\":1,\"note\":\"ESP32 auto\"}";

    int httpCode = http.POST(createPayload);

    if (httpCode != 200) {
        Serial.printf("Create failed: %d\n", httpCode);
        http.end();
        return "";
    }

    // Parse create_time from response
    String response = http.getString();
    http.end();

    DynamicJsonDocument createDoc(1024);
    deserializeJson(createDoc, response);
    long createTime = createDoc["data"][0]["create_time"];

    // Step 2: Fetch voucher code
    String statUrl = "https://" + String(UNIFI_HOST)
        + "/proxy/network/api/s/default/stat/voucher";

    http.begin(client, statUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", API_KEY);

    String statPayload = "{\"create_time\":" + String(createTime) + "}";
    httpCode = http.POST(statPayload);

    if (httpCode != 200) {
        Serial.printf("Stat failed: %d\n", httpCode);
        http.end();
        return "";
    }

    response = http.getString();
    http.end();

    DynamicJsonDocument statDoc(2048);
    deserializeJson(statDoc, response);
    String voucherCode = statDoc["data"][0]["code"].as<String>();

    return voucherCode;  // e.g. "38495-29174"
}
```

### ESP32 Memory Considerations

- **WiFiClientSecure** uses ~40KB of heap for TLS
- **ArduinoJson** `DynamicJsonDocument(2048)` is plenty for voucher responses
- Total overhead: ~50KB -- well within ESP32's 320KB SRAM
- Use `ESP.getFreeHeap()` to monitor

### ESP32 Libraries Needed

| Library | Purpose | PlatformIO |
|---------|---------|------------|
| WiFiClientSecure | HTTPS with cert skip | Built-in |
| HTTPClient | HTTP POST/GET | Built-in |
| ArduinoJson | JSON parsing | `bblanchon/ArduinoJson@^7` |

### ESP-IDF Alternative (No Arduino)

If using ESP-IDF directly instead of Arduino framework:

```c
#include "esp_http_client.h"
#include "esp_tls.h"

esp_http_client_config_t config = {
    .url = "https://172.20.7.1/proxy/network/api/s/default/cmd/hotspot",
    .method = HTTP_METHOD_POST,
    .skip_cert_common_name_check = true,
    .transport_type = HTTP_TRANSPORT_OVER_SSL,
    .crt_bundle_attach = NULL,  // No CA bundle needed
};

// Or use esp_tls with skip_common_name = true
```

### Timing and Reliability

- HTTPS POST to local UDM: ~200-500ms per request
- Full create+stat flow: ~500-1000ms total
- Add retry logic for network hiccups
- Consider caching the last few voucher codes in case the printer fires but API call failed

---

## 6. Common Duration Reference

| Duration | Minutes | Payload |
|----------|---------|---------|
| 1 hour | 60 | `"expire":60` |
| 4 hours | 240 | `"expire":240` |
| 8 hours | 480 | `"expire":480` |
| 1 day | 1440 | `"expire":1440` |
| 3 days | 4320 | `"expire":4320` |
| 1 week | 10080 | `"expire":10080` |
| 2 weeks | 20160 | `"expire":20160` |
| 30 days | 43200 | `"expire":43200` |
| 90 days | 129600 | `"expire":129600` |
| 365 days | 525600 | `"expire":525600` |

---

## 7. Gotchas and Edge Cases

1. **Two-step process**: `create-voucher` returns `create_time`, NOT the code. You MUST call `stat/voucher` to get the actual code.

2. **UDM path prefix**: Always use `/proxy/network/` before `/api/s/...` on UDM devices. Without it you get 404.

3. **Local users only**: Ubiquiti cloud/SSO accounts do NOT work for API access. Create a dedicated local-only admin.

4. **Voucher format**: Codes are 10 digits formatted as `XXXXX-XXXXX`. The dash is part of the display format but might not be in the API response - test this on your controller.

5. **Expire = after activation**: The countdown starts when a guest enters the code, not when you created it. Pre-generating vouchers is fine.

6. **stat/voucher is POST, not GET**: Even though you're "reading" data, the endpoint expects a POST with optional JSON filter body.

7. **CSRF tokens**: Cookie auth on some UDM firmware requires `X-CSRF-Token` header. API key auth doesn't have this problem.

8. **Rate limiting**: No documented rate limits, but don't hammer the API. The ESP32 button debounce is your friend.

9. **Quota semantics**: `quota: 0` means unlimited devices can use the code. `quota: 1` means single-use (one device). `quota: 5` means 5 devices can use the same code.

---

## Sources

- [Art-of-WiFi/UniFi-API-client (PHP)](https://github.com/Art-of-WiFi/UniFi-API-client) -- most comprehensive community API client
- [DJM0/unifi-voucher-generator (Bash)](https://github.com/DJM0/unifi-voucher-generator) -- working shell script with curl examples
- [glenndehaan/unifi-voucher-site (Node.js)](https://github.com/glenndehaan/unifi-voucher-site) -- web-based voucher generator
- [ufozone/ha-unifi-voucher (Home Assistant)](https://github.com/ufozone/ha-unifi-voucher) -- HA integration for voucher management
- [dim13/unifi (Go)](https://github.com/dim13/unifi/blob/master/vouchers.go) -- Go structs showing voucher data model
- [Ubiquiti Community Wiki - API Reference](https://ubntwiki.com/products/software/unifi-controller/api)
- [Ubiquiti Help - Hotspots and Captive Portals](https://help.ui.com/hc/en-us/articles/115000166827-UniFi-Hotspots-and-Captive-Portals)
- [Ubiquiti Help - Getting Started with UniFi API](https://help.ui.com/hc/en-us/articles/30076656117655-Getting-Started-with-the-Official-UniFi-API)
- [PaintSplasher/unifi-voucher-service](https://github.com/PaintSplasher/unifi-voucher-service) -- employee-facing voucher printer
- [etiennecollin/unifi-voucher-manager](https://github.com/etiennecollin/unifi-voucher-manager) -- touch-friendly voucher interface
- [Random Nerd Tutorials - ESP32 HTTPS](https://randomnerdtutorials.com/esp32-https-requests/) -- ESP32 HTTPS with cert skipping
- [ESP32 Forum - HTTPS without certificate](https://esp32.com/viewtopic.php?t=12451) -- setInsecure() pattern
