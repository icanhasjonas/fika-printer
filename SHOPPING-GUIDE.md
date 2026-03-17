# Shopping Guide - FIKA WiFi Code Printer

> Last updated: 2026-03-06\
> Links verified: 2026-03-06\
> Maintained by Roberto - "I'M GONNA STAB YOU WITH THIS SHOPPING LIST!"

---

## Thermal Printers - Full Comparison

All printers below are 58mm, ESC/POS compatible, 384 dots/line (203 DPI).
Interface must include **TTL serial** for direct ESP32 UART connection.

### By Price (lowest first)

| # | Model | Price | Auto-Cut | Interface | Power | Platform | Link |
|---|-------|-------|----------|-----------|-------|----------|------|
| 1 | GOOJPRT QR203 | ~$12-18 (THB 440) | No | RS232+TTL | 5-9V | AliExpress | [Buy](https://www.aliexpress.com/item/32653084570.html) |
| 2 | GOOJPRT QR701 (TTL only) | ~$18 (THB 560) | No | TTL | 5-12V | AliExpress | [Buy](https://www.aliexpress.com/item/32879834378.html) |
| 3 | GOOJPRT QR701 (TTL+RS232) | ~$20 (THB 620) | No | TTL+RS232 | 5-12V | AliExpress | [Buy](https://www.aliexpress.com/item/32889094923.html) |
| 4 | GOOJPRT QR701 (alt listing) | ~$20 (THB 620) | No | TTL+RS232 | 5-9V | AliExpress | [Buy](https://www.aliexpress.com/item/4000670706301.html) |
| 5 | GOOJPRT QR204 | ~$19-25 (THB 460) | No | RS232+TTL+USB | 5-9V | AliExpress | [Buy #1](https://www.aliexpress.com/item/4000622723922.html), [Buy #2](https://www.aliexpress.com/item/32733740176.html) |
| 6 | EM5820 | ~$12-18 (THB 390-580) | No | USB+RS232+TTL | 5-12V | AliExpress | [Buy](https://www.aliexpress.com/item/1005004513800835.html) |
| 7 | CSN-A2 (Cashino) | ~$24-28 (THB 750-870) | No | RS232/TTL/USB | 5-9V | AliExpress | [Buy](https://www.aliexpress.com/item/1479835966.html) |
| 8 | Generic 58mm TTL (Thailand stock) | THB 870 | No | TTL+RS232+USB | 5-12V | Lazada TH | Via BigGo search |
| 9 | **GOOJPRT 58mm Auto-Cutter** | **~$30-40 (THB 1,050-1,400)** | **YES** | RS232+TTL | 5-9V | AliExpress | [Buy](https://www.aliexpress.com/i/33027994801.html) |
| 10 | HSPOS 2-inch Panel | ~$42 (THB 1,468) | Some models | TTL+RS232+USB | 12V | AliExpress | [Buy](https://www.aliexpress.com/item/32943252253.html) |
| 11 | Mini TTL/RS232 for Arduino | THB 1,850 | No | TTL+RS232 | 5-12V | Lazada TH | [Buy](https://www.lazada.co.th/products/mini-thermal-printer-ttl-rs232-arduino-1-i5104334254.html) |
| 12 | DFRobot DFR0503 V1 | THB 1,985 | No | TTL+USB | 5-9V | Arduitronics | [Buy](https://www.arduitronics.com/product/4111/) |
| 13 | DFRobot V2.0 | ~$39 (THB 1,400) | No | TTL+USB+RS232+RS485 | 9-24V | DFRobot | [Buy](https://www.dfrobot.com/product-1799.html) |
| 14 | HS-EC58 | ~$50 (THB 1,750) | **YES** | USB+TTL or USB+RS232 | 12V | AliExpress | [Buy](https://www.aliexpress.com/item/32943252253.html) |
| 15 | M5Stack ATOM Printer K118 | ~$59 (THB 2,065) | No | Built-in ESP32 | 12V | M5Stack | [Buy](https://shop.m5stack.com/products/atom-thermal-printer-kit), [AliExpress](https://www.aliexpress.com/item/1005003611321752.html) |
| 16 | Cashino EP-260C | ~$85 (THB 2,975) | **YES** | RS232+USB/TTL | 24V | AliExpress | [Buy](https://www.aliexpress.com/item/32669227461.html) |

### Spec Comparison (Top Picks)

| Spec | QR203 | QR701 | QR204 | CSN-A2 | GOOJPRT Cutter | M5Stack K118 |
|------|-------|-------|-------|--------|----------------|--------------|
| Print Speed | 60-80mm/s | 50-90mm/s | 50-85mm/s | 60-80mm/s | 50-80mm/s | 60mm/s |
| Resolution | 384 dots | 384 dots | 384 dots | 384 dots | 384 dots | 384 dots |
| Print Width | 48mm | 48mm | 48mm | 48mm | 48mm | 48mm |
| Paper Roll | 57.5mm | 57.5mm, 39mm dia | 57.5mm, 30mm dia | 57.5mm, 39mm dia | 57.5mm | 58mm |
| Weight | ~150g | 183g | 134g | ~180g | ~250g | 285g |
| Buffer | - | 32KB | - | - | - | - |
| NV Flash | - | 64KB | - | - | - | - |
| Auto-Cutter | No | No | No | No | **YES** | No |
| QR Code (ESC/POS) | Bitmap only | YES | YES | YES | YES | YES |
| Barcodes | Basic | UPC/EAN/Code39/128 | UPC/EAN/Code39/128 | UPC/EAN/Code39/128 | UPC/EAN/Code39/128 | YES |
| ESP32 Tested | Community | **Proven** | Community | **Proven** (Adafruit) | Should work | **Built-in** |

---

## Platform Verdict

| Platform | Selection | Price | Shipping to TH | Verdict |
|----------|-----------|-------|----------------|---------|
| **AliExpress** | Excellent | $12-50 | Free, 2-3 weeks | **BEST for price** |
| **Lazada TH** | Poor (2-3 listings) | THB 870-1,850 | 1-3 days | **BEST for speed** |
| **Shopee TH** | Not indexed | Unknown | 1-3 days | Search manually on app |
| **Temu TH** | None found | N/A | N/A | No embedded modules |
| **Arduitronics** | 1 listing | THB 1,985 | Domestic | Good quality, pricey |
| **DFRobot** | 1 listing | ~$39 | International | Premium option |

---

## Recommended Buy Strategy

### Option A: Cheapest + Fastest Start (ESP32 DIY)

Order TWO printers in parallel:

1. **Lazada TH** - THB 1,850 TTL/RS232 module ([link](https://www.lazada.co.th/products/mini-thermal-printer-ttl-rs232-arduino-1-i5104334254.html))
   - Arrives in days, start prototyping immediately
   - Use for development and testing

2. **AliExpress** - GOOJPRT Auto-Cutter ~$35 ([link](https://www.aliexpress.com/i/33027994801.html))
   - Arrives in 2-3 weeks
   - Production unit with clean cuts for FIKA deployment

### Option B: Budget Only (ESP32 DIY)

- **AliExpress** - GOOJPRT QR701 ~$18-20 ([link](https://www.aliexpress.com/item/32889094923.html))
  - Best documented, proven ESP32 compatibility
  - Manual tear-off (no cutter)
  - Wait 2-3 weeks for shipping

### Option C: Zero Wiring (M5Stack)

- **M5Stack ATOM Printer** ~$59 ([link](https://shop.m5stack.com/products/atom-thermal-printer-kit))
  - ESP32 built in, WiFi ready
  - Just program and go
  - No auto-cutter, 12V needed
  - Less flexible for custom firmware

### Option D: Turnkey Android POS -- RECOMMENDED

- **Sunmi V2** (used) ~$60-80 / THB 1,500-3,000
  - Full Android device with built-in 58mm printer
  - Zero wiring, zero enclosure design
  - Write a Kotlin/Flutter app, sideload via ADB
  - Working prototype in 1 day (software only)
  - Search Facebook Marketplace TH for "Sunmi V2" (retired GrabFood/Deliveroo units)
  - New on Lazada TH: THB 5,500 | AliExpress: $80-120
  - No auto-cutter (manual tear-off)
  - See [ANDROID-PRINTER-RESEARCH.md](ANDROID-PRINTER-RESEARCH.md) for full details

### Option E: Loyverse POS + Network Printer (Buttonless)

- **Any ESC/POS network printer** on LAN + Loyverse webhook
  - No physical buttons needed -- staff uses existing Loyverse POS
  - Webhook fires on sale, listener generates voucher and prints
  - Tracks WiFi pass sales in Loyverse reports
  - Need: network printer ($40-150), RPi/server for listener
  - See [LOYVERSE-INTEGRATION.md](LOYVERSE-INTEGRATION.md) for full details

### Option F: WiFi Network Printer + ESP32/RPi (Hybrid)

- **Xprinter XP-C300H WiFi** -- ~~[Lazada i4811955370](https://www.lazada.co.th/products/-i4811955370.html)~~ **AVOID (sent used/opened unit!)**
  - ~~ORDERED: Lazada #1085823315076067 -- THB 4,890 -- RETURNED~~
  - WiFi + LAN + USB + RS232, 300mm/s, 80mm, auto-cutter
  - **Buy from:** [Lazada i4811889747 -- THB 8,990](https://www.lazada.co.th/products/xprinter-xp-c300h-4in1-wifilanusbrs232-80-thermal-pos-printer-80mm-wifi-lan-usb-rs232-auto-cut-speed-300mmsec-i4811889747.html) or [Shopee](https://shopee.co.th/Xprinter-XP-C300H-%E0%B8%A3%E0%B8%B8%E0%B9%88%E0%B8%99%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9-WiFi-LAN-USB-RS232-%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%A3%E0%B8%B1%E0%B8%A7-80%E0%B8%A1%E0%B8%A1-Autocut-%E0%B9%80%E0%B8%AA%E0%B8%96%E0%B8%B5%E0%B8%A2%E0%B8%A3%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B8%E0%B8%94-Speed300mm-sec-POS-Printer-i.42865931.23875780322)
  - Pair with ESP32 from parts bin (TCP/9100 over WiFi LAN)
  - Native QR codes, no bitmap generation needed
  - 80mm paper = bigger, cleaner receipts than 58mm
  - See [NETWORK-PRINTER-RESEARCH.md](NETWORK-PRINTER-RESEARCH.md) for full details + all verified buy links
- **Alternatives on AliExpress (2-3 weeks):**
  - [XP-N160II WiFi ~$35-55](https://www.aliexpress.com/item/1005005149168869.html)
  - [XP-C260M WiFi ~$45-70](https://www.aliexpress.com/item/1005006397476516.html)
  - [NETUM NT-8330 WiFi ~$67](https://www.aliexpress.com/item/1005003688210562.html)

---

## Other Parts Needed

| Item | Est. Price | Where to Buy | Notes |
|------|-----------|--------------|-------|
| 58mm thermal paper rolls (10-pack) | THB 50-100 | Lazada TH | Standard receipt paper, dirt cheap |
| 3x arcade push buttons (large, LED) | THB 30-60 each | Lazada/Shopee | Search "arcade button LED" |
| 3x arcade push buttons (basic) | THB 5-10 each | Lazada/Shopee | Search "momentary push button 12mm" |
| 5V 3A USB-C power supply | THB 100-200 | Lazada | Powers both ESP32 + printer |
| ESP32-WROOM DevKit (if needed) | THB 150-250 | Lazada/Shopee | Any basic devkit works |
| Jumper wires (M-F, F-F) | THB 20-40 | Lazada | For prototyping |
| 1K + 2K resistors | THB 5 | Parts bin / Lazada | Voltage divider for UART RX |
| Project enclosure / box | THB 100-300 | Lazada | Or 3D print one |

---

## AliExpress Search Tips

These search queries surface the right products:

1. `58mm thermal printer TTL auto cutter embedded` - broadest
2. `GOOJPRT auto cutter TTL` - specific brand with cutter
3. `58mm panel thermal printer cutter RS232 TTL` - kiosk modules
4. `GOOJPRT QR701` - best documented no-cutter model
5. `embedded thermal printer module 58mm cutter` - generic

**Filters:**
- Sort by "Orders" for proven sellers
- Check interface option (many listings have USB/RS232/TTL as separate SKUs)
- Look for "with cutter" vs "without cutter" variants in same listing
- Free shipping to Thailand is common on $20+ items

---

## ESP32 Arduino/PlatformIO Libraries

| Library | Best For | Link |
|---------|----------|------|
| BinaryWorlds/ThermalPrinter | QR701 (tested!) | [GitHub](https://github.com/BinaryWorlds/ThermalPrinter) |
| Adafruit Thermal Printer | CSN-A2 / generic | [Adafruit](https://www.adafruit.com/product/597) |
| cranties/escposprinter | Generic ESC/POS, QR support | [GitHub](https://github.com/cranties/escposprinter) |
| lorot19/ThermalPrinter | Bitmap-only, no deps | [GitHub](https://github.com/lorot19/ThermalPrinter) |
| mzyy94/QRCode-esp32 | QR matrix generation | [GitHub](https://github.com/mzyy94/QRCode-esp32) |

---

## Reference Links

### Tutorials & Guides
- [ESP32 + Thermal Printer Tutorial (Circuit Digest)](https://circuitdigest.com/microcontroller-projects/how-to-interface-thermal-printer-with-esp32)
- [ESP32 + Thermal Printer UART ESC/POS (Circuit Splash)](https://www.circuitsplash.com/interfacing-esp32-with-thermal-printer-using-uart-escpos)
- [QR701 Basics Teardown (LEAP#523)](https://leap.tardate.com/playground/thermalprinter/qr701basics/)
- [Thermal Printers with ESP32 (Hackaday.io)](https://hackaday.io/project/203858-thermal-printers-with-esp32)
- [M5Stack ATOM Printer Review (CNX Software)](https://www.cnx-software.com/2021/11/29/wireless-thermal-printer-kit-features-m5stack-atom-lite-controller/)

### Datasheets & Manuals
- [CSN-A2 User Manual (PDF)](https://cdn-shop.adafruit.com/datasheets/CSN-A2+User+Manual.pdf)
- [M5Stack ATOM Printer Docs](https://docs.m5stack.com/en/atom/atom_printer)
- [Cashino EP-261C Product Page](https://www.cashinotech.com/cashino-ep-261c-58mm-rs232-usb-ttl-paper-near-end-embedded-panel-thermal-receipt-ticket-printer-with-auto-cutter_p130.html)
- [HSPOS HS-EC58 Product Page](https://hsprinter.com/en/product/Queue-System-Machine-Printer-HS-EC58.html)

### Community & Forums
- [Arduino Forum - QR203 TTL Pinout](https://forum.arduino.cc/t/thermal-printer-goojprt-qr203-ttl-pinout/953705)
- [Arduino Forum - GOOJPRT with ESP32-CAM](https://forum.arduino.cc/t/powering-driving-goojprt-thermal-printer-with-esp32-cam/1329694)

### Exact-Match Projects (WiFi code printing!)
- [**hennedo/guest-password-printer**](https://github.com/hennedo/guest-password-printer) - RPi Zero + Adafruit printer + button + UniFi API. Exactly our project!
- [**SB Hackerspace WiFi Guest Code Generator**](https://sbhackerspace.com/2017/02/08/raspberry-pi-wi-fi-guest-code-generator/) - RPi + USB thermal printer + button + UniFi. [Hackaday writeup](https://hackaday.com/2017/02/10/press-button-get-hackspace-wi-fi-code/)
- [LNbits TPoS Receipt Printer](https://github.com/lnbits/tpos-receipt-printer) - ESP32 thermal printer for payment receipts (similar architecture)

### UniFi Voucher Tools
- [UniFi Voucher Generator (Bash)](https://github.com/DJM0/unifi-voucher-generator)
- [UniFi Voucher Site (Node.js)](https://github.com/glenndehaan/unifi-voucher-site)
- [UniFi Voucher Service (Employee-facing)](https://github.com/PaintSplasher/unifi-voucher-service)
- [UniFi Voucher Manager (Touch-friendly)](https://github.com/etiennecollin/unifi-voucher-manager)

---

## Suppliers - Where to Buy in Thailand

### Cytron Technologies Thailand (th.cytron.io)

Jonas's go-to maker shop. Ships domestically in Thailand, fast delivery.

**Website:** [th.cytron.io](https://th.cytron.io)\
**Email:** th.sales@cytron.io\
**Payment:** PayPal, Credit Card

**Good for:** ESP32 devkits, Raspberry Pi boards, buttons, breadboards, jumper wires,
power supplies, GPIO breakouts, cases - basically everything EXCEPT the thermal printer.

**Does NOT carry:** Thermal receipt printers, thermal paper rolls.

**Jonas's previous Cytron orders:**

| Date | Item | Code | Price (THB) |
|------|------|------|-------------|
| Jan 2023 | RPi Compute Module 4 (W, 8GB/8GB) | CM4-W-R8-E8 | 3,790 |
| Jan 2023 | RPi CM4 + Official IO Board Kit | CK-CM4W88-K1 | 5,476 |
| Jul 2023 | RPi CM4 Mini Base Board + Breadboard | - | ~1,500 |
| Jul 2023 | RPi 4 Model B 8GB + T-Cobbler | RASPBERRY-PI-4B-8G | 3,465 |
| Jul 2023 | 5V 5A PoE+ HAT for RPi | - | 1,760 |
| Jul 2025 | RPi CM5 (No Wireless, 8GB, Lite) | CM5-NW-R8-L | 3,178 |

### Seeed Studio (seeedstudio.com)

International maker shop, ships DHL from China (2-5 days to Thailand).

**Website:** [seeedstudio.com](https://www.seeedstudio.com)\
**Jonas's Seeed order:** #4000392094 (Jul 2025)

### ALLNET China (shop.allnetchina.cn)

Specialty electronics, ships to Thailand (7-20 days).

**Jonas's ALLNET order:** QuinLED Dig Quad v3 ($64.05, Nov 2024)

### Arduitronics (arduitronics.com)

Thai maker shop, authorized DFRobot reseller. Carries the DFRobot embedded
thermal printer (THB 1,985) - one of the few Thai sources for maker-grade printers.

**Website:** [arduitronics.com](https://www.arduitronics.com)

### AliExpress

Best prices for thermal printer modules. 2-3 week shipping to Thailand, usually free.
See printer comparison table above for specific listings.

---

## All-In-One Options (Printer + Buttons + CPU)

### Sunmi V2 -- THE WINNER ($60-120)

A used restaurant delivery terminal. Android phone + 58mm thermal printer + WiFi
in a counter-ready enclosure. The recommended approach for this project.

- Full Android 7.1 -- install custom APKs via ADB
- Official Sunmi Printer SDK (Kotlin, Flutter, React Native wrappers)
- Volume Up/Down buttons remappable to voucher durations
- 5.45" touchscreen for third button / status display
- WiFi + Bluetooth + 4G built-in
- Root available (XDA community)
- No auto-cutter (manual tear-off on 58mm paper)
- **Used:** THB 1,500-3,000 on Facebook Marketplace (ex-GrabFood/Deliveroo)
- **New:** THB 5,500 on Lazada TH | $80-120 on AliExpress
- [Full details](ANDROID-PRINTER-RESEARCH.md) | [AliExpress](https://www.aliexpress.com/w/wholesale-sunmi-v2.html)

Other turnkey options that also work but are less optimal:

### M5Stack ATOM Printer Kit ($59)

The closest all-in-one. ESP32-Pico + 58mm printer + 1 button in a compact box.

- Has 1 built-in button on ATOM Lite (add 2 more via GPIO)
- WiFi capable, Arduino-programmable
- QR code printing supported
- No auto-cutter, 12V power needed
- Cardboard enclosure (replace with 3D print)
- [Buy from M5Stack](https://shop.m5stack.com/products/atom-thermal-printer-kit) | [AliExpress](https://www.aliexpress.com/item/1005003611321752.html)

### Queue Ticket Dispensers (Hackable Enclosures)

These have buttons + printer in a nice polycarbonate shell, but are dumb devices.
Could gut them and drop in an ESP32:

- [KOQICALL Ticket Dispenser](https://www.amazon.com/KOQICALL-Receipt-Thermal-3-Digits-Restaurant/dp/B0BTPC8YN6) - $50-80, RED button + FEED button
- [KOQICALL 4-Way](https://www.amazon.com/KOQICALL-Different-Department-Wireless-TP-4/dp/B0CS2X9BZT) - multi-button variant
