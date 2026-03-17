# Thermal Printer Research for WiFi Code Printer

> Research date: 2026-02-23\
> Purpose: Find cheap 58mm thermal printers with TTL serial + auto-cutter for ESP32 project\
> Scope: Bare printer modules for the ESP32 DIY approach (Approach A)
>
> **Also see:** [ANDROID-PRINTER-RESEARCH.md](ANDROID-PRINTER-RESEARCH.md) for turnkey
> Android POS printers (Sunmi V2, etc.) and [LOYVERSE-INTEGRATION.md](LOYVERSE-INTEGRATION.md)
> for the buttonless POS webhook approach.

---

## TL;DR - Best Options

| Model | Auto-Cutter | Interface | Voltage | Price (AliExpress) | Verdict |
|-------|------------|-----------|---------|-------------------|---------|
| **GOOJPRT QR203** | NO | TTL/RS232 | 5-9V | ~$12-18 | Cheapest, no cutter |
| **GOOJPRT JP-QR701** | NO | TTL/RS232 | 5-9V | ~$15-22 | Better documented, no cutter |
| **GOOJPRT w/ Auto Cutter** (33027994801) | YES | TTL/RS232 | 5-9V | ~$35-50 | Best bet with cutter |
| **HS-EC58** | YES | TTL/RS232/USB | 5-9V | ~$30-45 | Good cutter module |
| **Cashino EP-261C** | YES | TTL/RS232/USB | 5-9V | ~$40-60 | Industrial quality, pricier |
| **CSN-A2** | Optional | TTL/RS232 | 5-9V | ~$15-25 | Classic, well-documented |
| **M5Stack ATOM Printer** | NO | Built-in ESP32 | 5V USB-C | ~$30 | Turnkey, but no cutter |

**Reality check:** Auto-cutter models are $30-50, not $10-20. The cheapest bare modules (QR203, CSN-A2) are $12-22 but have NO cutter. That's the trade-off.

---

## Detailed Printer Breakdown

### 1. GOOJPRT QR203 - Budget King (No Cutter)

The absolute cheapest embedded module. Bare PCB with print head.

**Specs:**
- Resolution: 384 dots/line (8 dots/mm)
- Print width: 48mm effective on 57.5mm paper
- Speed: 60-80mm/s
- Interface: RS232 + TTL (dual)
- Power: DC 5-9V
- Character set: ASCII, GB2312-80
- Baud: typically 9600 (configurable)
- Size: very compact bare module

**Pros:** Dirt cheap (~$12-18), tiny, well-known in maker community\
**Cons:** NO auto-cutter, documentation requires contacting GOOJPRT for SDK, QR printing via bitmap only (no built-in QR ESC/POS command on older firmware)

**AliExpress search:** "QR203 thermal printer TTL"

**Arduino forum thread:** [QR203 TTL pinout discussion](https://forum.arduino.cc/t/thermal-printer-goojprt-qr203-ttl-pinout/953705)

### 2. GOOJPRT JP-QR701 - Best Documented (No Cutter)

Slightly larger and better documented than QR203. The go-to for Arduino/ESP32 projects.

**Specs:**
- Resolution: 384 dots/line (8 dots/mm)
- Print width: 48mm
- Speed: 90mm/s (faster than QR203!)
- Interface: RS232 / TTL
- Power: DC 5V/2A recommended (range 5-9V)
- Input buffer: 32KB
- NV Flash: 64KB
- Barcodes: UPC-A/E, EAN13/8, CODE39, ITF, CODABAR, CODE93, CODE128
- Character sets: ANK, GB2312
- Print head life: 50km

**Pros:** Best documented, 90mm/s speed, 32KB buffer, proven ESP32 compatibility\
**Cons:** NO auto-cutter, still ~$15-22

**Tested library:** [BinaryWorlds/ThermalPrinter](https://github.com/BinaryWorlds/ThermalPrinter) -- tested specifically on JP-QR701

**Detailed teardown:** [LEAP#523 QR701 Basics](https://leap.tardate.com/playground/thermalprinter/qr701basics/)

**AliExpress:** [JP-QR701 listing](https://www.aliexpress.com/i/4000670706301.html)

### 3. GOOJPRT 58mm with Auto Cutter - Best Bet

GOOJPRT's panel printer with auto-cutter. This is the upgraded version of the QR701 with a guillotine cutter added.

**Specs:**
- Same print specs as QR701 (384 dots/line, 48mm width)
- RS232 + TTL interface
- ESC/POS command support
- Auto-cutter (full or partial cut)
- DC 5-9V (cutter needs more current - expect 2A+ peaks)

**Price:** ~$35-50 on AliExpress

**AliExpress:** [GOOJPRT auto cutter listing](https://www.aliexpress.com/i/33027994801.html)

### 4. CSN-A2 (Cashino) - The Classic

The most widely documented embedded thermal printer in the maker world. Adafruit sells a version of this.

**Specs:**
- Resolution: 384 dots/line (8 dots/mm)
- Print width: 48mm
- Speed: 60mm/s (max 80mm/s)
- Interface: Serial RS-232C / TTL / parallel
- Baud: 19200, 8N1
- Power: DC 5-9V
- Dimensions: 111 x 65 x 57mm
- Operating temp: 5-50C
- Print head life: 50km

**Auto-cutter:** Available as optional variant (CSN-A2 with cutter costs more)

**Pros:** Extremely well documented, Adafruit has full Arduino library, tons of tutorials\
**Cons:** Slower (60mm/s), the cutter variant is hard to find cheap

**Documentation:** [CSN-A2 User Manual (PDF)](https://cdn-shop.adafruit.com/datasheets/CSN-A2+User+Manual.pdf)\
**Manufacturer:** [Cashino CSN-A2](https://www.cashinotech.com/csn-a2-58mm-mini-panel-thermal-receipt-printer_p11.html)

### 5. HS-EC58 - Budget Auto-Cutter Module

An embedded panel module with auto-cutter that shows up frequently on eBay and AliExpress.

**Specs:**
- 58mm paper width
- Auto-cutter (full/partial)
- TTL + RS232 + USB interfaces
- Embedded panel mount design
- DC 5-9V (some variants up to 24V)

**Price:** ~$30-45

**eBay listings:** [HS-EC58 on eBay](https://www.ebay.com/itm/176020691710)

### 6. Cashino EP-261C - Industrial Grade

Professional embedded kiosk printer. More expensive but rock solid.

**Specs:**
- 58mm thermal, auto-cutter
- RS232 / USB / TTL interfaces
- Paper near-end sensor
- Designed for kiosk/terminal integration
- Full ESC/POS support

**Price:** ~$40-60

**Manufacturer page:** [Cashino EP-261C](https://www.cashinotech.com/cashino-ep-261c-58mm-rs232-usb-ttl-paper-near-end-embedded-panel-thermal-receipt-ticket-printer-with-auto-cutter_p130.html)

### 7. M5Stack ATOM Printer - Turnkey Option

Not a bare module - this is a complete unit with built-in ESP32-Pico.

**Specs:**
- Built-in ESP32-Pico controller
- 58mm thermal printing
- USB-C power
- WiFi AP mode for direct printing
- Supports text, graphics, barcodes, QR codes out of the box

**Price:** ~$30

**Pros:** Zero wiring, works immediately, built-in WiFi\
**Cons:** NO auto-cutter, closed ecosystem (less flexible), might be hard to customize for WiFi code printing use case

**Product page:** [M5Stack ATOM Printer](https://shop.m5stack.com/products/atom-thermal-printer-kit)

---

## ESP32 Wiring Guide

### UART Pin Connections

```
┌──────────────────────────────────────────────┐
│   ESP32     │         │  Thermal Printer     │
│             │         │                      │
│  GPIO 17 TX ─┼────────►│─ RX                 │
│  GPIO 16 RX ─┼◄────────┤─ TX                 │
│         GND ─┼─────────┤─ GND                │
│             │         │                      │
└──────────────────────────────────────────────┘

Power (SEPARATE supply, shared GND):
┌──────────────────────────────────┐
│  5V/2A+   ──► Printer VCC        │
│  PSU      ──► Printer GND ──┐    │
└──────────────────────────────────┘
                              ├── Common GND
ESP32 GND ────────────────────┘
```

### Key Wiring Notes

1. **Use UART2** (GPIO 16 RX, GPIO 17 TX) -- UART0 is for USB debug, UART1 has flash conflicts
2. **NEVER power the printer from ESP32** -- printers draw 1-2A peaks when printing. Use a dedicated 5V 2A+ supply
3. **Share GND** between ESP32 and printer power supply (critical for UART communication)
4. **No level shifter needed** for most TTL printers -- they accept 3.3V logic from ESP32 on RX. The printer's TX output at 5V won't damage ESP32 GPIO (they're 5V tolerant on input per most datasheets, though technically 3.3V logic). For safety, add a voltage divider on ESP32 RX line:

```
Printer TX ──[1K]──┬──► ESP32 GPIO 16 (RX)
                   │
                  [2K]
                   │
                  GND
```

This drops 5V to ~3.3V. Cheap insurance.

### Baud Rate

- **Default:** 9600 bps for most cheap printers (QR203, QR701)
- **CSN-A2:** 19200 bps default
- **Config:** 8 data bits, no parity, 1 stop bit (8N1)

### Power Budget

| State | Current Draw |
|-------|-------------|
| Idle | 50-100mA |
| Printing text | 500-800mA |
| Printing graphics/QR | 1.0-1.5A |
| Auto-cutter activation | 1.5-2.0A peak |
| **Recommended PSU** | **5V 3A** (headroom for cutter) |

---

## QR Code Printing

### Method 1: Built-in ESC/POS QR Commands (Preferred)

Most modern ESC/POS printers support native QR code generation. The printer handles rendering internally -- you just send the data string.

**ESC/POS QR Command Sequence:**

```cpp
// 1. Select QR model (Model 2)
uint8_t setModel[] = {0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00};

// 2. Set module size (1-16, bigger = larger QR)
uint8_t setSize[] = {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08}; // size 8

// 3. Set error correction (48=L, 49=M, 50=Q, 51=H)
uint8_t setEC[] = {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31}; // M level

// 4. Store QR data
// pL and pH encode (data.length + 3) as little-endian 16-bit
String qrData = "WIFI:T:WPA;S:MyNetwork;P:MyPassword;;";
int len = qrData.length() + 3;
uint8_t storeData[] = {0x1D, 0x28, 0x6B, (uint8_t)(len & 0xFF), (uint8_t)(len >> 8),
                       0x31, 0x50, 0x30};
// Then send qrData bytes

// 5. Print QR code
uint8_t printQR[] = {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30};
```

**WiFi QR format:** `WIFI:T:WPA;S:<SSID>;P:<password>;;`
- Scannable by any modern phone camera
- Works on both iOS and Android

### Method 2: Bitmap Printing (Fallback)

If the printer doesn't support ESC/POS QR commands, generate the QR code on the ESP32 and send it as a bitmap.

**Library:** [QRCode-esp32](https://github.com/mzyy94/QRCode-esp32) -- generates QR matrix on ESP32

**Process:**
1. Generate QR code matrix using the library
2. Scale up pixels (each QR module = 4x4 or 8x8 dots for visibility)
3. Convert to bitmap format (1 bit per dot, MSB first)
4. Send using ESC/POS bitmap print command: `GS v 0`
5. Max bitmap width: 384 dots (48 bytes per line) for 58mm paper

**Bitmap width:** 384 dots / 8 = 48 bytes per row\
**QR code size:** A Version 4 QR (WiFi string) is 33x33 modules\
**Scaled 8x:** 264x264 dots -- fits within 384 dot width with centering

---

## AliExpress Search Strategy

These search queries on AliExpress will surface the right products:

1. `"58mm thermal printer TTL auto cutter embedded"` - broadest
2. `"GOOJPRT auto cutter TTL"` - specific brand
3. `"58mm panel thermal printer cutter RS232 TTL"` - kiosk modules
4. `"HS-EC58 thermal printer"` - specific budget cutter model
5. `"embedded thermal printer module 58mm cutter"` - generic

**Filter tips:**
- Sort by "Orders" to find proven sellers
- Check the interface option carefully - many listings have USB/RS232/TTL as separate SKUs
- Look for "with cutter" vs "without cutter" variants in the same listing
- Free shipping to Thailand is common on $20+ items

---

## Recommendation for WiFi Code Printer Project

### Budget Path (~$15-20, no auto-cutter)

Get a **JP-QR701** or **QR203**. Skip the auto-cutter and use manual tear-off (perforated tear bar). These are well-documented, cheap, and proven with ESP32.

- Simplest wiring, lowest power requirements
- Tons of Arduino/ESP32 code examples
- Manual tear-off is fine for occasional WiFi code printing

### Quality Path (~$35-50, with auto-cutter)

Get the **GOOJPRT 58mm with auto cutter** (AliExpress item 33027994801) or **HS-EC58**.

- Clean automatic cut after each print
- More professional feel for guest-facing deployment
- Needs beefier power supply (5V 3A)
- Slightly more complex enclosure design

### Turnkey Path (~$30, no cutter)

Get the **M5Stack ATOM Printer** if you want zero wiring hassle. But you'll be fighting their firmware to customize it, and there's no cutter.

### My Pick

**JP-QR701 without cutter for prototyping** (~$15). Get the concept working, verify the QR code prints scannable, test the full flow. THEN upgrade to a cutter model if you want the polished version.

The cutter is a nice-to-have but adds cost, complexity, and power requirements. For a wall-mounted WiFi code printer that prints maybe 5-10 receipts a day, manual tear-off is totally fine.

---

## Arduino/ESP32 Libraries

| Library | Printer | Features | Link |
|---------|---------|----------|------|
| BinaryWorlds/ThermalPrinter | JP-QR701 | Text, bitmap, scaling | [GitHub](https://github.com/BinaryWorlds/ThermalPrinter) |
| lorot19/ThermalPrinter | Generic ESC/POS | Bitmap-only, no library deps | [GitHub](https://github.com/lorot19/ThermalPrinter) |
| cranties/escposprinter | Generic ESC/POS | Full ESC/POS driver, QR support | [GitHub](https://github.com/cranties/escposprinter) |
| mzyy94/QRCode-esp32 | N/A (QR generation) | Generate QR matrix on ESP32 | [GitHub](https://github.com/mzyy94/QRCode-esp32) |
| Adafruit Thermal Printer | CSN-A2 / Adafruit mini | Full featured, well maintained | [Adafruit](https://www.adafruit.com/product/597) |

---

## Sources

- [Circuit Digest - ESP32 Thermal Printer Tutorial](https://circuitdigest.com/microcontroller-projects/how-to-interface-thermal-printer-with-esp32)
- [Circuit Splash - ESP32 + Thermal Printer UART ESC/POS](https://www.circuitsplash.com/interfacing-esp32-with-thermal-printer-using-uart-escpos)
- [LEAP#523 - QR701 Basics](https://leap.tardate.com/playground/thermalprinter/qr701basics/)
- [Hackaday.io - Thermal Printers with ESP32](https://hackaday.io/project/203858-thermal-printers-with-esp32)
- [Arduino Forum - QR203 TTL Pinout](https://forum.arduino.cc/t/thermal-printer-goojprt-qr203-ttl-pinout/953705)
- [Arduino Forum - GOOJPRT with ESP32-CAM](https://forum.arduino.cc/t/powering-driving-goojprt-thermal-printer-with-esp32-cam/1329694)
- [CSN-A2 User Manual (PDF)](https://cdn-shop.adafruit.com/datasheets/CSN-A2+User+Manual.pdf)
- [Cashino EP-261C Product Page](https://www.cashinotech.com/cashino-ep-261c-58mm-rs232-usb-ttl-paper-near-end-embedded-panel-thermal-receipt-ticket-printer-with-auto-cutter_p130.html)
- [BinaryWorlds ThermalPrinter Library](https://github.com/BinaryWorlds/ThermalPrinter)
- [GOOJPRT Auto Cutter on AliExpress](https://www.aliexpress.com/i/33027994801.html)
- [QR701 on AliExpress](https://www.aliexpress.com/i/4000670706301.html)
- [M5Stack ATOM Printer](https://shop.m5stack.com/products/atom-thermal-printer-kit)
