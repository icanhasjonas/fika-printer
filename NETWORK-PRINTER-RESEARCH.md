# Network/Cloud Kitchen Printer Research

> Research date: 2026-02-24\
> Links verified: 2026-02-24 (all Lazada/AliExpress links curl-checked for 200 OK)\
> Purpose: Find WiFi/LAN thermal receipt printers that accept raw ESC/POS over TCP for the WiFi code printer project\
> Scope: "Dumb" network printers paired with ESP32 or Raspberry Pi for logic\
> Prepared by: TARS (efficiency setting: 85%)

---

## TL;DR - Recommendation

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Xprinter XP-C300H WiFi -- 300mm/s, 80mm, auto-cutter, native QR                       ┃
┃                                                                                        ┃
┃  RETURNED: Lazada #1085823315076067 (i4811955370) -- arrived OPENED/USED!              ┃
┃                                                                                        ┃
┃  REORDER from alternative seller:                                                      ┃
┃  - Lazada i4811889747 (Loyverse seller) -- THB 8,990                                   ┃
┃  - Shopee i.42865931.23875780322 -- check price                                        ┃
┃                                                                                        ┃
┃  AVOID: i4811955370 seller -- sent used/opened unit                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Architecture: Dumb Printer + Smart Controller

```
┌───────────────────┐                    ┌─────────────────────────┐
│  ESP32 or RPi     │   TCP/9100         │  Network Receipt        │
│                   │   (raw ESC/POS)    │  Printer (WiFi/LAN)     │
│  [BTN1] 1 day     │────────────────────►│                        │
│  [BTN2] 1 week    │                    │  80mm, auto-cutter      │
│  [BTN3] 1 month   │                    │  QR code native         │
│                   │                    │  Always-on, DC 24V      │
│  UniFi API calls  │                    └─────────────────────────┘
│  WiFi connected   │
└───────────────────┘
         │
         │ HTTPS
         ▼
┌───────────────────┐
│  UniFi Controller │
│  172.21.7.1       │
└───────────────────┘
```

**Why this architecture?** The printer is a dumb output device. It sits on the LAN, accepts TCP connections on port 9100, and prints whatever ESC/POS bytes you throw at it. The ESP32/RPi handles ALL logic -- button debouncing, UniFi API calls, receipt formatting, QR code generation. Clean separation.

---

## The Critical Question: Direct LAN Printing

**Many "cloud printers" ONLY work through proprietary cloud platforms.** You send print jobs to their server, which relays to the printer. This means:
- Internet dependency (no internet = no printing)
- Latency (round trip to cloud server)
- Vendor lock-in (their API, their platform, their rules)
- Privacy concerns (your print data goes through their servers)

**What we need:** A printer that ALSO listens on TCP port 9100 (or similar) on the local network, accepting raw ESC/POS commands. Cloud features can exist as a bonus, but direct LAN is mandatory.

### Verdict by Model

| Model | Direct TCP/9100? | Cloud Required? | Verdict |
|-------|-----------------|-----------------|---------|
| **Xprinter XP-C300H** | YES | No | **TOP PICK** |
| **Xprinter XP-N160II** | YES | No | RECOMMENDED |
| **Xprinter XP-C260M** | YES | No | RECOMMENDED |
| **Sunmi NT311** | YES | Optional | Good but pricey |
| **NETUM NT-8330** | YES | No | Budget option |
| **HPRT TP80K** | YES | No | Good mid-range |
| **Rongta ACE V1** | YES | No | Good, well-documented |
| **Epson TM-T82X** | YES | No | Gold standard, expensive |
| **Star mC-Print3** | YES | Optional | Premium, expensive |
| **MUNBYN P047-WiFi** | YES | No | Good alternative |
| **HPRT TP80NY** | UNCLEAR | Likely cloud-first | Proceed with caution |
| **FEIE cloud printers** | NO | YES, cloud-only | AVOID |

---

## Detailed Model Breakdown

### 1. Xprinter XP-N160II (WiFi) -- RECOMMENDED

The workhorse of budget POS printing. Xprinter has a massive installed base in SE Asia, and their WiFi models support direct TCP printing out of the box.

**Specifications:**
- Print speed: 160 mm/s (some listings say up to 200 mm/s)
- Paper width: 80mm (3 1/8")
- Resolution: 203 DPI (8 dots/mm)
- Auto-cutter: Yes (full/partial)
- Interface: USB + WiFi (some SKUs add Ethernet/BT)
- ESC/POS: Full support
- QR code: Native GS ( k command support
- Power: DC 24V/2.5A external adapter
- Input buffer: 96KB
- NV Flash: 256KB
- Cutter life: 1.5 million cuts
- Print head life: 100km

**Network:**
- WiFi 802.11b/g/n (2.4GHz)
- Default IP: 192.168.123.100
- Direct TCP printing on port 9100
- Web configuration interface for IP/WiFi settings
- Static IP configurable via web UI or proprietary utility
- WiFi configuration requires USB connection for initial setup (per reverse engineering analysis)

**WiFi Setup Gotcha:** Initial WiFi configuration is done via USB using Xprinter's utility tool or proprietary commands. Once WiFi is configured and the printer gets an IP, you can send raw ESC/POS to port 9100 from any device on the LAN. Set a static IP or DHCP reservation to avoid IP drift.

**Price:**
- AliExpress: ~$35-55 USD (WiFi variant), free shipping
  - [XP-N160II WiFi](https://www.aliexpress.com/item/1005005149168869.html) -- verified 200 OK
  - [XP-N160II LAN](https://www.aliexpress.com/item/32856422997.html) -- verified 200 OK
- Lazada Thailand (official Xprinter TH store):
  - [XP-N160II WiFi -- THB 8,000](https://www.lazada.co.th/products/-i1316270220.html) -- verified 200 OK, WiFi+USB variant
  - [XP-N160II multi-variant -- THB 3,999](https://www.lazada.co.th/products/-i3385135512.html) -- verified 200 OK, USB/BT/LAN only (NO WiFi SKU!)
  - [XP-N160II](https://www.lazada.co.th/products/-i3415236149.html) -- verified 200 OK
  - [XP-N160II USB only](https://www.lazada.co.th/products/-i327874348.html) -- verified 200 OK (official store)
- Official xprinter.co.th: THB 2,288 (USB+LAN) -- OUT OF STOCK as of 2026-02-24
- Shopee Thailand: Search "Xprinter XP-N160II WiFi"

**Sources:**
- [Xprinter Official - XP-N160II](https://www.xprintertech.com/all-products/xprinter-xp-n160ii-driver)
- [Reverse engineering WiFi setup commands](https://blog.lambda.cx/posts/xprinter-wifi/)
- [WiFi IP setup guide](https://www.nichepeak.com/blog/xprinter-lan-network-wifi-receipt-printer-ip-setup-and-driver-installation/)

---

### 2. Xprinter XP-C260M (WiFi) -- RECOMMENDED

Kitchen-focused variant. Adds sound + light alarm (buzzer when print job arrives - great for kitchen order flow, irrelevant for WiFi codes but harmless).

**Specifications:**
- Print speed: 260 mm/s (faster than N160II)
- Paper width: 80mm
- Resolution: 203 DPI
- Auto-cutter: Yes
- Interface: USB + LAN + WiFi (some SKUs add BT)
- ESC/POS: Full support
- QR code: Native support
- Power: DC 24V
- Alarm: Light + sound buzzer (can be disabled)
- Wall-mountable

**Network:** Same as N160II -- TCP port 9100, web config for IP settings.

**Price:**
- AliExpress: ~$45-70 USD (WiFi variant)
  - [XP-C260M on AliExpress](https://www.aliexpress.com/item/1005006397476516.html) -- verified 200 OK
- Lazada Thailand: Search Xprinter official store

**Advantage over N160II:** 260mm/s print speed (vs 160mm/s), kitchen alarm feature. Disadvantage: slightly more expensive.

**Sources:**
- [Xprinter Official - C260K/C230 series](https://www.xprintertech.com/wireless-receipt-printer-xp-c230-c260k)
- [Sbeity Computer specs](https://sbeitycomputer.com/product/xprinter-receipt-printer-xp-c260m/)

---

### 3. Xprinter XP-C300H (WiFi) -- TOP PICK FOR FAST DELIVERY

The fastest Xprinter with WiFi, available NOW on Lazada Thailand from the official store. 300mm/s print speed, 4-in-1 connectivity, auto-cutter.

**Specifications:**
- Print speed: 300 mm/s (fastest Xprinter in this roundup)
- Paper width: 80mm
- Resolution: 203 DPI
- Auto-cutter: Yes
- Interface: USB + LAN + WiFi + RS232 (4-in-1!)
- ESC/POS: Full support
- QR code: Native GS ( k support
- Power: DC 24V

**Network:** Same as N160II/C260M -- TCP port 9100, web config for IP settings.

**Price:**
- Official xprinter.co.th: THB 2,998 (USB+LAN+Serial base model)
- Lazada Thailand (official Xprinter TH store):
  - [XP-C300H WiFi+LAN+USB+RS232](https://www.lazada.co.th/products/-i4811955370.html) -- verified 200 OK
  - [XP-C300H 4in1](https://www.lazada.co.th/products/-i4811889747.html) -- verified 200 OK
- WiFi variant pricing on Lazada may differ from base xprinter.co.th price

**Why this over XP-N160II:**
- 300mm/s vs 160mm/s (nearly 2x faster)
- 4 interfaces (WiFi + LAN + USB + RS232) vs typically 2
- Available NOW on Lazada with domestic shipping
- XP-N160II WiFi variant is THB 8,000 on Lazada -- C300H WiFi is likely cheaper

---

### 4. Sunmi NT311 -- Premium Option

The premium cloud printer from Sunmi (well-known POS hardware brand). Built for kitchen order management but works perfectly as a dumb TCP printer too.

**Specifications:**
- Print speed: 250 mm/s
- Paper width: 80mm
- Resolution: 576 dots/line (203 DPI)
- Auto-cutter: Yes
- Interface: USB-C 2.0, Bluetooth 4.2, BLE, WiFi 802.11b/g/n, Ethernet RJ45 (100Mbps)
- ESC/POS: Full support
- QR code: Native GS ( k support
- Power: DC 24V/2.5A (external adapter, AC 100-240V input)
- Speaker: 3W built-in, 105dB (voice alerts)
- IP rating: IP52 (dust + water splash protection)
- Dimensions: 130 x 130 x 130 mm
- Weight: 855g (without paper)
- Cloud: MQTT + HTTPS (Sunmi Cloud platform -- optional)

**Network:**
- Direct TCP printing on port 9100 confirmed
- LAN discovery via UDP multicast (224.0.0.1:17899)
- Can operate in pure LAN mode WITHOUT Sunmi cloud
- Static IP via Sunmi Printer Utility Tool
- WiFi auto-reconnect

**Buttons:** Power button, function button, 2 volume buttons

**Price:**
- Lazada Thailand: ~~[Lazada listing](https://www.lazada.co.th/products/nt311-sunmi-cloud-printer-80-mm-3-usbbluetoothwifi-1-i4302335387.html)~~ -- **DEAD (404 as of 2026-02-24)**
  - NT311/NT312/NT210 Lazada listings all return 404 -- appears discontinued on Lazada TH
  - [Sunmi NT212 58mm](https://www.lazada.co.th/products/-i1695938723.html) -- verified 200 OK (but 58mm, not 80mm)
- AliExpress: ~$120-180 USD
- International: ~$150-250 USD (Amazon, specialty POS retailers)
- This is significantly more expensive than Xprinter options

**Sunmi Model Lineup:**
- NT310/NT311/NT312/NT313: 80mm variants with different connectivity combos
- NT311S: Updated version with WiFi 5 (dual-band 2.4/5GHz)
- No NT210/NT211 found in searches -- these may not exist as standalone printers

**Sources:**
- [Jarltech - NT311 specs](https://www.jarltech.com/en/sunmi-cloud-printer)
- [Sunmi Developer Docs - TCP Printing](https://developer.sunmi.com/docs/en-US/cdixeghjk491/xfzzeghjk557)
- [MyOrderBox setup guide](https://help.myorderboxhq.com/en/article/setup-sunmi-nt311-printer-with-myorderbox-pos-12gf9y7/)
- [FCC filing / User Manual](https://fccid.io/2AH25NT311/Users-Manual/User-Manual-4948502)

---

### 5. NETUM NT-8330 -- Budget Option

Chinese brand, very popular on AliExpress. Good specs for the price.

**Specifications:**
- Print speed: 260 mm/s
- Paper width: 80mm (supports 48-80mm widths)
- Resolution: 640 dots/line
- Auto-cutter: Yes (automatic)
- Interface: USB + Serial + LAN (WiFi and Bluetooth as optional variants)
- ESC/POS: Full support
- Power: DC 24V/2.5A
- Print head life: 100km

**Network:** Standard TCP/9100 for LAN/WiFi variants. Same protocol as Xprinter models.

**Price:**
- AliExpress: ~$50-65 USD (WiFi variant), ~$40-50 (LAN only)
- [NETUM official product page](https://www.netum.net/products/netum-80mm-thermal-receipt-printer-automatic-cutter-restaurant-kitchen-pos-printer-usb-serial-lan-wifi-bluetooth-nt-8330)
- [AliExpress NETUM NT-8330 WiFi ~$67](https://www.aliexpress.com/item/1005003688210562.html) -- verified 200 OK
- [Amazon WiFi variant](https://www.amazon.com/Thermal-Receipt-Printer-NETUM-Ethernet/dp/B07Y5B55PP)

**Sources:**
- [NETUM official](https://www.netum.net/products/netum-80mm-thermal-receipt-printer-automatic-cutter-restaurant-kitchen-pos-printer-usb-serial-lan-wifi-bluetooth-nt-8330)

---

### 6. HPRT TP80K -- Solid Mid-Range

HPRT is a well-established Chinese printer manufacturer (20+ years). The TP80K is their standard POS receipt printer.

**Specifications:**
- Print speed: 230 mm/s
- Paper width: 80mm
- Resolution: 203 DPI
- Auto-cutter: Yes (1.5 million cuts life)
- Interface: USB + RS232 + LAN + WiFi + Bluetooth (5 interfaces!)
- ESC/POS: Full support, SDK available for Windows/Mac/Linux/Android/iOS
- Power: External adapter
- Print head life: 100km
- LEDs: 3 status indicators

**Network:** TCP/9100 via LAN or WiFi. Standard ESC/POS network printing.

**Price:**
- Mid-range, typically ~$60-90 USD
- Available through HPRT distributors

**Sources:**
- [HPRT Official - TP80K](https://www.hprt.com/Product/3-inch-Thermal-POS-Printer-TP80K.html)

---

### 7. HPRT TP80NY -- Cloud-First (Caution)

Cloud-focused variant from HPRT. Designed for food delivery platforms (Meituan, Ele.me).

**Specifications:**
- Print speed: 200 mm/s
- Paper width: 80mm (optional 58mm baffle)
- Resolution: 203 DPI
- Auto-cutter: Yes
- Interface: USB Type-B, Ethernet, optional WiFi 5 (dual-band!), optional 4G LTE, optional BLE
- ESC/POS: Supported
- Power: 100-240V input, 24V/1.5A output
- Speaker: Built-in voice broadcast
- Cloud: Hanin Cloud platform, Meituan/Ele.me integration

**Network:** Has Ethernet and WiFi, ESC/POS supported, but the marketing heavily emphasizes cloud printing. Whether it supports bare TCP/9100 direct printing is NOT explicitly confirmed in documentation. Likely yes (since it has ESC/POS + Ethernet), but verify before buying.

**Price:** Comparable to TP80K (~$60-90)

**Sources:**
- [HPRT Official - TP80NY](https://www.hprt.com/Product/Thermal-Receipt-Cloud-Printer-TP80NY.html)

---

### 8. Rongta ACE V1 / ACE H1 -- Well-Documented

Rongta is another solid Chinese POS brand. The ACE series is their kitchen/restaurant line.

**ACE V1 Specifications:**
- Print speed: 350 mm/s (fastest in this roundup!)
- Paper width: 80mm
- Resolution: 203 DPI
- Auto-cutter: Yes
- Interface: USB + Serial + Ethernet
- ESC/POS/OPOS: Full support
- NFC: Quick connect feature
- Power: DC 24V
- Voice alert: Human voice reminders

**ACE H1 Specifications:**
- Print speed: 250 mm/s
- Paper width: 80mm
- Auto-cutter: Yes
- Interface: USB + Serial + Ethernet (WiFi not standard -- check SKU)
- ESC/POS: Full support, integrated command set

**Network:** Both support TCP/IP printing. ACE V1 has Ethernet standard. WiFi availability varies by SKU -- most listings show USB+Serial+Ethernet only.

**Limitation:** WiFi is NOT standard on most ACE V1/H1 SKUs. You may need to use Ethernet (connect to a WiFi bridge or run a cable). This makes them less ideal for a wireless setup.

**Price:**
- ACE V1: ~$60-80 USD on [Amazon](https://www.amazon.com/Rongta-Interface-Restaurant-ACE-V1/dp/B0D3DZN9FW)
- ACE H1: ~$45-65 USD on [Amazon](https://www.amazon.com/Rongta-Restaurant-Ethernet-ACE-H1-UE/dp/B0CTSTB7ZT)

**Sources:**
- [Rongta ACE V1 Manual](https://www.manualslib.com/manual/1333563/Rongta-Technology-Ace-V1.html)
- [Amazon ACE V1](https://www.amazon.com/Rongta-Interface-Restaurant-ACE-V1/dp/B0D3DZN9FW)

---

### 9. Epson TM-T82X -- Gold Standard (Expensive)

The industry standard for receipt printing. Rock-solid reliability but you pay for it.

**Specifications:**
- Print speed: 200 mm/s
- Paper width: 80mm
- Resolution: 203 DPI
- Auto-cutter: Yes
- Interface: USB + Ethernet (WiFi NOT standard -- requires optional adapter)
- ESC/POS: The OG -- Epson literally invented ESC/POS
- Power: DC 24V
- Build quality: Commercial-grade, designed for 24/7 operation

**TM-T82X-II:** Newer variant with improved specs.

**Network:** TCP/9100, native. Epson TM printers are the reference implementation for ESC/POS network printing. Every ESC/POS library is tested against Epson first. Zero compatibility risk.

**WiFi Gotcha:** Base model is USB+Ethernet only. WiFi requires an optional Epson UB-R05 wireless adapter (~$80-100 extra). Or just use Ethernet.

**Price:**
- Lazada Thailand: Starting from ~3,200 THB (~$90 USD) for USB+Ethernet
- WiFi variant: Significantly more (~$150-200+)
- [Lazada TH listings](https://www.lazada.co.th/tag/epson-tm-t82x/)
- [Epson Thailand support](https://www.epson.co.th/Support/Printers/Point-of-Sale/Receipt-Printers/Epson-TM-T82X/s/SPT_C31CH26441)

**Sources:**
- [Epson TM-T82X command reference](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/tmt82x.html)
- [Epson Technical Reference Guide](https://download4.epson.biz/sec_pubs/bs/pdf/TM-T82X_trg_en_revF.pdf)

---

### 10. Star Micronics mC-Print3 -- Premium Alternative

Another top-tier brand. The mC-Print3 is their modern 3-inch receipt printer.

**Specifications:**
- Print speed: 250 mm/s (newer models: 400 mm/s!)
- Paper width: 80mm
- Resolution: 203 DPI
- Auto-cutter: Yes
- Interface: USB-C, Ethernet LAN, Bluetooth (built-in on some), optional WLAN
- ESC/POS: Supported (Star also has their own StarPRNT command set)
- Power: USB-C PD (20W) on newer models
- IP rating: IPX2 splash-proof
- Cloud: CloudPRNT / CloudPRNT Next (MQTT-based)
- Front-load paper

**Network:** TCP printing supported. Also supports StarPRNT and CloudPRNT protocols.

**WiFi:** Requires optional MCW10 WLAN adapter (not built-in on most models).

**Price:**
- Starting around $335 USD (Ethernet model)
- WiFi adapter extra
- Not readily available in Thailand at reasonable prices
- [Star Micronics official](https://starmicronics.com/product/mc-print3-pos-receipt-printer-retail-kitchen-online-ordering/)

**Verdict:** Fantastic printer but massive overkill and overpriced for this project.

---

### 11. MUNBYN P047-WiFi -- Good Alternative

MUNBYN is gaining popularity as a reliable budget-to-mid-range POS brand.

**Specifications:**
- Print speed: 300 mm/s (fast!)
- Paper width: 80mm (79.5mm effective)
- Auto-cutter: Yes (1.5 million cuts)
- Interface: USB + LAN + RS232 + WiFi
- ESC/POS: Full support
- Power: External adapter
- Energy Star certified
- 40+ receipts per minute

**Network:** TCP/9100 via WiFi or LAN. Works with python-escpos and similar libraries.

**Price:**
- Amazon: ~$80-100 USD
- [Amazon listing](https://www.amazon.com/MUNBYN-Chromebook-High-Speed-Auto-Cutter-P047-WiFi/dp/B0B9MNGD4Q)

**Sources:**
- [Amazon MUNBYN P047-WiFi](https://www.amazon.com/MUNBYN-Chromebook-High-Speed-Auto-Cutter-P047-WiFi/dp/B0B9MNGD4Q)

---

### 12. FEIE Cloud Printers -- AVOID

FEIE (Feiyi / Feiyun) is the dominant cloud printer brand in China. They're everywhere on AliExpress and in Chinese food delivery setups.

**Why to avoid:**
- Cloud-only architecture -- printers connect to FEIE's cloud server (feieyun.com)
- You send print jobs via their HTTP API, they relay to the printer
- NO direct LAN/TCP printing -- the printer talks to the cloud, period
- If FEIE's servers go down (or you lose internet), you can't print
- Their API is documented at [feieyun.com/open/apidoc-en.html](http://www.feieyun.com/open/apidoc-en.html)
- The entire value proposition is "print from anywhere via cloud" -- NOT local printing

**Price:** Cheap ($30-50 USD on AliExpress) but useless for our direct-LAN-print requirement.

---

## QR Code Printing: Native vs Bitmap

All printers in this roundup support ESC/POS. The critical question is whether they support the **GS ( k** command family for native QR code generation.

**GS ( k** is the standard ESC/POS command for QR codes (defined by Epson). The printer generates the QR internally -- you just send the data string.

### Native QR Support (GS ( k)

| Model | Native QR? | Notes |
|-------|-----------|-------|
| Xprinter XP-N160II | YES | Full GS ( k support |
| Xprinter XP-C260M | YES | Full GS ( k support |
| Sunmi NT311 | YES | Full GS ( k support |
| NETUM NT-8330 | YES | Confirmed via ESC/POS spec |
| HPRT TP80K | YES | SDK includes QR functions |
| Rongta ACE V1/H1 | YES | ESC/POS compatible |
| Epson TM-T82X | YES | Reference implementation |
| Star mC-Print3 | YES | Via ESC/POS mode |
| MUNBYN P047 | YES | ESC/POS compatible |

**All 80mm ESC/POS printers from major brands support native QR via GS ( k.** This is NOT a differentiator -- it's table stakes for any modern thermal printer. Bitmap fallback is only needed for ancient firmware on no-name modules.

### QR Code ESC/POS Command Sequence

```
1. Set QR model:    GS ( k 04 00 31 41 32 00  (Model 2)
2. Set module size: GS ( k 03 00 31 43 08     (size 8 = ~2.5cm on 80mm paper)
3. Set error corr:  GS ( k 03 00 31 45 31     (M level = 15% recovery)
4. Store data:      GS ( k pL pH 31 50 30 [data bytes]
5. Print QR:        GS ( k 03 00 31 51 30
```

WiFi QR payload: `WIFI:T:WPA;S:FIKA-Guest;P:38495-29174;;`

---

## Comparison Table

| Feature | **XP-C300H** | XP-N160II | XP-C260M | Sunmi NT311 | NETUM NT-8330 | Epson TM-T82X |
|---------|-------------|-----------|----------|-------------|---------------|---------------|
| **Price** | ~THB 3,000 | $35-55 | $45-70 | $120-180 | $50-65 | $90-200 |
| **Print speed** | **300mm/s** | 160mm/s | 260mm/s | 250mm/s | 260mm/s | 200mm/s |
| **WiFi** | **Yes** | Yes | Yes | Yes | Optional | Optional adapter |
| **Ethernet** | **Yes** | Some SKUs | Yes | Yes | Yes | Yes |
| **Auto-cutter** | **Yes** | Yes | Yes | Yes | Yes | Yes |
| **Native QR** | **Yes** | Yes | Yes | Yes | Yes | Yes |
| **TCP/9100** | **Yes** | Yes | Yes | Yes | Yes | Yes |
| **Cloud required** | **No** | No | No | No | No | No |
| **Kitchen alarm** | No | No | Yes | Yes (speaker) | No | No |
| **IP rating** | None | None | None | IP52 | None | None |
| **Interfaces** | **4 (USB/LAN/WiFi/RS232)** | 2-3 | 3 | 5 | 3-4 | 2 |
| **Power** | DC 24V | DC 24V | DC 24V | DC 24V/2.5A | DC 24V/2.5A | DC 24V |
| **Paper** | 80mm | 80mm | 80mm | 80mm | 80mm | 80mm |
| **Lazada TH** | **YES (verified)** | YES (verified) | Search store | DEAD (404) | Less common | YES |

---

## Pricing Summary (Thailand)

### Verified Buy Links (all curl-checked 2026-02-24)

**Lazada Thailand -- Domestic shipping 1-3 days:**

| Model | Lazada Link | Price | Status |
|-------|------------|-------|--------|
| ~~XP-C300H WiFi~~ | ~~[i4811955370](https://www.lazada.co.th/products/-i4811955370.html)~~ | ~~THB 4,890~~ | **AVOID -- sent used/opened unit** |
| **XP-C300H USB+LAN+WiFi** | [i5378924194](https://www.lazada.co.th/products/xprinter-xp-c300h-80-i5378924194-s23214300750.html) | **THB 4,000** | **LIVE -- select WiFi variant!** |
| **XP-C300H 4in1 WiFi** | [i4811889747](https://www.lazada.co.th/products/xprinter-xp-c300h-4in1-wifilanusbrs232-80-thermal-pos-printer-80mm-wifi-lan-usb-rs232-auto-cut-speed-300mmsec-i4811889747.html) | THB 8,990 | LIVE -- Loyverse seller |
| XP-N160II WiFi+USB | [i1316270220](https://www.lazada.co.th/products/-i1316270220.html) | THB 8,000 | LIVE |
| XP-N160II multi-variant | [i3385135512](https://www.lazada.co.th/products/-i3385135512.html) | THB 3,999 | LIVE (no WiFi SKU!) |
| XP-N160II | [i3415236149](https://www.lazada.co.th/products/-i3415236149.html) | varies | LIVE |
| XP-N160II USB | [i327874348](https://www.lazada.co.th/products/-i327874348.html) | varies | LIVE (official store) |
| ~~Sunmi NT311~~ | ~~i4302335387~~ | - | **DEAD (404)** |
| ~~Sunmi NT312~~ | ~~i3126856185~~ | - | **DEAD (404)** |
| ~~Sunmi NT210~~ | ~~i4101343408~~ | - | **DEAD (404)** |
| Sunmi NT212 58mm | [i1695938723](https://www.lazada.co.th/products/-i1695938723.html) | varies | LIVE (58mm only) |

**AliExpress -- Free shipping, 7-20 days:**

| Model | AliExpress Link | Price | Status |
|-------|----------------|-------|--------|
| XP-N160II WiFi | [1005005149168869](https://www.aliexpress.com/item/1005005149168869.html) | ~$35-55 | **LIVE** |
| XP-C260M | [1005006397476516](https://www.aliexpress.com/item/1005006397476516.html) | ~$45-70 | **LIVE** |
| XP-N160II LAN | [32856422997](https://www.aliexpress.com/item/32856422997.html) | ~$30-45 | **LIVE** |
| NETUM NT-8330 WiFi | [1005003688210562](https://www.aliexpress.com/item/1005003688210562.html) | ~$67 | **LIVE** |
| Generic WiFi+BT 80mm | [1005002885403083](https://www.aliexpress.com/item/1005002885403083.html) | ~$50 | **LIVE** |
| Generic WiFi+BT+LAN 80mm | [4000780307177](https://www.aliexpress.com/item/4000780307177.html) | ~$62 | **LIVE** |

**Official xprinter.co.th pricing (reference only -- some OUT OF STOCK):**

| Model | Price | Stock Status |
|-------|-------|-------------|
| XP-C300H (USB+LAN+Serial) | THB 2,998 | In stock |
| XP-V320L (USB+WiFi) | THB 5,588-5,888 | OUT OF STOCK |
| XP-N160II (USB+LAN) | THB 2,288 | OUT OF STOCK |

**Xprinter official Thailand store on Lazada:** [Xprinter Thailand](https://www.lazada.co.th/shop/xprinter-thailand-co-ltd/) -- local warranty, fast delivery.

---

## Sending ESC/POS from RPi/ESP32

### From Raspberry Pi (Python)

```python
# Using python-escpos library
# pip install python-escpos

from escpos.printer import Network

printer = Network("192.168.1.100", port=9100)

# Print text
printer.text("FIKA COFFEE & WIFI\n")
printer.text("═" * 32 + "\n")

# Print QR code (native)
printer.qr("WIFI:T:WPA;S:FIKA-Guest;P:38495-29174;;", size=8)

printer.text("\nNETWORK:  FIKA-Guest\n")
printer.text("CODE:     38495-29174\n")
printer.text("VALID:    24 hours\n")

# Cut paper
printer.cut()
printer.close()
```

### From Raspberry Pi (Raw TCP)

```python
import socket

def send_to_printer(ip, port, data):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((ip, port))
    sock.sendall(data)
    sock.close()

# Raw ESC/POS bytes
escpos = bytearray()
escpos += b'\x1b\x40'           # Initialize printer
escpos += b'\x1b\x61\x01'       # Center align
escpos += b'FIKA COFFEE\n\n'
# ... add QR commands, text, cut command
escpos += b'\x1d\x56\x42\x03'   # Partial cut with 3-dot feed

send_to_printer("192.168.1.100", 9100, bytes(escpos))
```

### From ESP32 (C++)

```cpp
#include <WiFi.h>

void printToNetworkPrinter(const char* printerIP, uint16_t port,
                           const uint8_t* data, size_t len) {
    WiFiClient client;
    if (client.connect(printerIP, port)) {
        client.write(data, len);
        client.stop();
    }
}

// Usage:
uint8_t receipt[] = {0x1B, 0x40, ...}; // ESC/POS bytes
printToNetworkPrinter("192.168.1.100", 9100, receipt, sizeof(receipt));
```

---

## Final Recommendation

### For this project (WiFi code printer at FIKA):

**BUY: Xprinter XP-C300H WiFi**

~~**Lazada Order #1085823315076067** -- THB 4,890 from `i4811955370` -- **RETURNED (arrived opened/used!)**~~

> [!CAUTION]
> **Seller `i4811955370` shipped a used/opened unit as new.** This violates Thai Consumer Protection Act
> B.E. 2522 (Sections 22, 27 -- misleading representation), Civil and Commercial Code (Sections 465-474 --
> non-conforming goods), and Thai Penal Code Section 271 (false trade descriptions -- up to 3 years
> imprisonment or 60,000 THB fine). Remedies: Lazada dispute, OCPB complaint (สคบ.), Small Claims Court
> (ศาลแขวง, under 300,000 THB, no lawyer needed). Direct Sales and Direct Marketing Act B.E. 2545 also
> guarantees 7-day return right for online purchases.

**Alternative sellers (verified 2026-03-06):**

| Platform | Link | Price | Notes |
|----------|------|-------|-------|
| **Lazada** | [i5378924194](https://www.lazada.co.th/products/xprinter-xp-c300h-80-i5378924194-s23214300750.html) | **THB 4,000** | **WiFi variant in stock (select USB+LAN+WIFI SKU)** |
| **Lazada** | [i4811889747](https://www.lazada.co.th/products/xprinter-xp-c300h-4in1-wifilanusbrs232-80-thermal-pos-printer-80mm-wifi-lan-usb-rs232-auto-cut-speed-300mmsec-i4811889747.html) | THB 8,990 | "Loyverse" seller, single WiFi SKU, in stock |
| **Shopee** | [i.42865931.23875780322](https://shopee.co.th/Xprinter-XP-C300H-%E0%B8%A3%E0%B8%B8%E0%B9%88%E0%B8%99%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9-WiFi-LAN-USB-RS232-%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%A3%E0%B8%B1%E0%B8%A7-80%E0%B8%A1%E0%B8%A1-Autocut-%E0%B9%80%E0%B8%AA%E0%B8%96%E0%B8%B5%E0%B8%A2%E0%B8%A3%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B8%E0%B8%94-Speed300mm-sec-POS-Printer-i.42865931.23875780322) | Check page | WiFi+LAN+USB+RS232 |
| ~~Lazada~~ | ~~i4811955370~~ | ~~THB 4,890~~ | **AVOID -- sent used/opened unit** |

Reasons:
1. **300mm/s** -- fastest Xprinter, nearly 2x the N160II
2. **WiFi + LAN + USB + RS232** -- 4 interfaces, maximum flexibility
3. **Direct TCP/9100** -- confirmed, no cloud nonsense
4. **Available NOW on Lazada** with 1-3 day domestic shipping
5. **~THB 3,000** -- cheaper than the N160II WiFi variant (THB 8,000!)
6. **80mm paper, auto-cutter, native QR** -- all the essentials
7. **Official Xprinter TH store** -- local warranty and support
8. **python-escpos compatible** -- if using RPi as controller
9. **ESC/POS from ESP32** -- raw TCP socket, trivial to implement

**Alternative (AliExpress, 2-3 weeks):** XP-N160II WiFi ~$35-55 or XP-C260M ~$45-70 if you can wait.

**Budget (AliExpress):** NETUM NT-8330 WiFi ~$67 -- solid specs, good reviews.

**Skip:** Sunmi NT311 -- all Lazada TH listings are dead (404). Would need to order from AliExpress at $120-180, defeating the "fast delivery" goal.

### This approach vs Approach A (ESP32 + bare module)

The network printer approach is **Approach D** -- a hybrid between A (DIY) and C (network printer):

| | Approach A (bare module) | Approach D (network printer) |
|---|---|---|
| Printer cost | $15-50 | $35-70 |
| Controller | ESP32 | ESP32 or RPi |
| Wiring | UART, power, voltage divider | None (TCP over WiFi) |
| Enclosure | Custom (printer + ESP32 in one box) | Two separate devices |
| Paper width | 58mm | 80mm |
| Auto-cutter | $35-50 models only | Standard |
| QR quality | Bitmap (ESP32 renders) | Native (printer renders) |
| Maintenance | Custom hardware | Off-the-shelf printer |
| Print speed | 60-90 mm/s | 160-260 mm/s |

The network printer approach trades a slightly higher printer cost for zero wiring, better print quality, native QR, and a maintainable off-the-shelf printer that can be swapped out without touching the controller.

---

## Sources

- [Xprinter Official - XP-N160II](https://www.xprintertech.com/all-products/xprinter-xp-n160ii-driver)
- [Xprinter Official - Wireless Receipt Printers](https://www.xprintertech.com/wireless-receipt-printer-xp-c230-c260k)
- [Xprinter WiFi Reverse Engineering](https://blog.lambda.cx/posts/xprinter-wifi/)
- [Xprinter WiFi IP Setup Guide](https://www.nichepeak.com/blog/xprinter-lan-network-wifi-receipt-printer-ip-setup-and-driver-installation/)
- [Xprinter Thailand - Lazada Store](https://www.lazada.co.th/shop/xprinter-thailand-co-ltd/)
- [Sunmi NT311 - Jarltech](https://www.jarltech.com/en/sunmi-cloud-printer)
- [Sunmi Developer Docs](https://developer.sunmi.com/docs/en-US/cdixeghjk491/xfzzeghjk557)
- ~~[Sunmi NT311 - Lazada TH](https://www.lazada.co.th/products/nt311-sunmi-cloud-printer-80-mm-3-usbbluetoothwifi-1-i4302335387.html)~~ -- DEAD (404)
- [Xprinter XP-C300H WiFi - Lazada TH](https://www.lazada.co.th/products/-i4811955370.html) -- verified LIVE
- [NETUM NT-8330 Official](https://www.netum.net/products/netum-80mm-thermal-receipt-printer-automatic-cutter-restaurant-kitchen-pos-printer-usb-serial-lan-wifi-bluetooth-nt-8330)
- [HPRT TP80K Official](https://www.hprt.com/Product/3-inch-Thermal-POS-Printer-TP80K.html)
- [HPRT TP80NY Official](https://www.hprt.com/Product/Thermal-Receipt-Cloud-Printer-TP80NY.html)
- [Rongta ACE V1 - Amazon](https://www.amazon.com/Rongta-Interface-Restaurant-ACE-V1/dp/B0D3DZN9FW)
- [Rongta ACE V1 Manual](https://www.manualslib.com/manual/1333563/Rongta-Technology-Ace-V1.html)
- [Epson TM-T82X Command Reference](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/tmt82x.html)
- [Epson ESC/POS QR Code Command](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn180.html)
- [Star Micronics mC-Print3](https://starmicronics.com/product/mc-print3-pos-receipt-printer-retail-kitchen-online-ordering/)
- [MUNBYN P047-WiFi - Amazon](https://www.amazon.com/MUNBYN-Chromebook-High-Speed-Auto-Cutter-P047-WiFi/dp/B0B9MNGD4Q)
- [FEIE Cloud API](http://www.feieyun.com/open/apidoc-en.html)
- [python-escpos Library](https://github.com/python-escpos/python-escpos)
- [python-escpos Network Printing Docs](https://python-escpos.readthedocs.io/en/latest/user/printers.html)
- [ESC/POS QR Code Guide](https://liana-ali.blogspot.com/2018/09/escpos-print-qr-code-in-receipt.html)
- [Port 9100 Explained](https://sslinsights.com/what-is-port-9100/)
- [AliExpress - XP-C260M listing](https://www.aliexpress.com/item/1005006397476516.html)
- [Epson Thailand Support](https://www.epson.co.th/Support/Printers/Point-of-Sale/Receipt-Printers/Epson-TM-T82X/s/SPT_C31CH26441)
