# Turnkey Android Thermal Printers - Research

> Research date: 2026-02-23\
> Purpose: Evaluate all-in-one Android receipt printers as platform for WiFi voucher code printer\
> Alternative to: ESP32 + bare printer module approach (see [PRINTER-RESEARCH.md](PRINTER-RESEARCH.md))

---

## Why Consider This?

The ESP32 + bare printer approach works but requires wiring, enclosure design, and firmware from scratch. Restaurant delivery printers are mass-produced devices that already combine:

- Built-in thermal printer (58mm or 80mm)
- WiFi / Ethernet / 4G connectivity
- CPU with OS (Android or proprietary)
- Counter-ready enclosure with paper tray
- Auto-cutter (on 80mm models)
- Physical buttons
- Power supply included
- QR code printing via ESC/POS

If they run Android, we can sideload a custom APK that calls the UniFi voucher API and prints receipts -- no ESP32, no wiring, no enclosure design. Just software.

---

## TL;DR - The Two Categories

There are two fundamentally different product types here:

### Category 1: Android POS Terminals (RUN Android, install APKs)

These are full Android devices with a built-in printer. You can develop and install custom apps. This is what we want.

| Device | Android | Printer | WiFi | 4G | Auto-Cut | Buttons | Price | Best For |
|--------|---------|---------|------|----|----------|---------|-------|----------|
| **Sunmi V2** | 7.1 | 58mm | Yes | Yes | No | 3 | $80-120 | **BEST: hackable, proven** |
| **Sunmi V2s** | 7.1+ | 58mm | Yes | Yes | No | 3 | $120-160 | V2 upgrade, NFC, label print |
| **MUNBYN IPDA045** | 10 | 58mm | Yes | 4G | No | Vol+Home | $100-150 | Google Play built-in |
| **MUNBYN 6" PDA** | 10 | 58mm | Yes | 4G | No | Vol+Power | $120-160 | Larger screen |
| **iMin D1** | 11 | 58mm | Yes | 4G | No | Power | $200-300 | Desktop POS, dual display |
| **iMin Swift 2** | 13 | 58mm | Yes | 4G | No | Vol+Power | $150-200 | Handheld, latest Android |
| **Sunmi T2 Mini** | 7.1 | 58/80mm | Yes | Opt | Optional | Touch | $300-500 | Desktop tablet POS, overkill |

### Category 2: Cloud Printers (NO Android, proprietary firmware)

These are "dumb" printers with cloud connectivity. They receive print jobs via MQTT/API but you CANNOT install apps on them. Not suitable for our use case unless we build a cloud relay.

| Device | OS | Printer | WiFi | 4G | Auto-Cut | Buttons | Price |
|--------|-----|---------|------|----|----------|---------|-------|
| Sunmi NT311 | Proprietary | 80mm | Yes | Yes | Yes | 5 (vol, func, pair) | $100-150 |
| Sunmi NT210 | Proprietary | 58mm | Yes | Yes | No | 3 | $60-90 |
| HPRT TP80NY | Proprietary | 80mm | Yes | 4G opt | Yes | 4 (power, func, vol) | $80-120 |
| Rongta ACE V1 | Proprietary | 80mm | Yes | No | Yes | Feed | $60-90 |
| FEIE N80WC | Proprietary | 80mm | Yes | No | Yes | Feed | $40-60 |

**Verdict: Category 1 (Android POS terminals) is the way to go.** We need to run custom code on the device itself.

---

## Detailed Breakdown - Android POS Terminals

### 1. Sunmi V2 -- THE ONE TO GET

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  SUNMI V2 - Best hackable Android receipt printer           ┃
┃                                                             ┃
┃  Android 7.1 | MediaTek MT6739WA | 1GB+8GB                  ┃
┃  58mm printer | WiFi+4G+BT | 5.45" screen                   ┃
┃  $80-120 on AliExpress | THB 5,500 on Lazada TH             ┃
┃                                                             ┃
┃  PROVEN: Rooted, reverse-engineered, XDA community          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Hardware:**
- CPU: MediaTek MT6739WA (quad-core ARM Cortex-A53)
- RAM: 1GB (some versions 2GB)
- Storage: 8GB (some versions 16GB)
- Display: 5.45" IPS touchscreen
- Printer: 58mm thermal, ESC/POS, text + QR + barcode
- Camera: rear camera + front camera
- NFC: supported
- Battery: removable 7.6V (equal to ~7000mAh 3.85V)
- Connectivity: WiFi 802.11 b/g/n, Bluetooth 4.2, 4G LTE, GPS

**Physical Buttons:**
- Volume Up / Volume Down (side)
- Power button (side)
- These CAN be remapped in a custom Android app via KeyEvent listeners

**Software/Hackability:**
- Runs Android 7.1.1 Nougat, kernel 4.4.22
- **USB debugging works without RSA key verification** (huge for development)
- Developer mode: Settings > About > tap Build Number 7x
- Sideload APKs: Security > Device Admin > Unknown Sources
- ADB install via USB works normally
- Root available via CVE-2020-0069 (mtk-su exploit for MediaTek)
- Official Sunmi SDK for printer control (AIDL service `woyou.aidlservice.jiuiv5`)
- Flutter/React Native/native Android SDKs available
- XDA forums: active community with root methods, firmware dumps, custom ROMs

**Limitations:**
- SunmiBaseService can overwrite some config files when connected to internet
- Recovery-from-boot mechanism tries to revert system modifications
- No auto-cutter (58mm paper, manual tear-off)
- Android 7.1 is old -- some modern libraries may not support it

**Availability:**
- AliExpress: $80-120 (search "Sunmi V2 POS terminal") -- [AliExpress listing](https://www.aliexpress.com/w/wholesale-sunmi-v2.html)
- Lazada Thailand: THB 5,500 (V2s with 3GB/32GB) -- [Lazada TH](https://www.lazada.co.th/tag/sunmi-v2/)
- eBay: $100-150 used/refurbished
- Second-hand Deliveroo/GrabFood units flood the market in Thailand and Australia

**Developer Resources:**
- [Sunmi Developer Portal](https://developer.sunmi.com/docs/en-US/index)
- [XDA - Root/Firmware Thread](https://xdaforums.com/t/firmware-root-method-sunmi-v2.4531909/)
- [XDA - Unblock/Fresh OS](https://xdaforums.com/t/sunmi-v2-unblock-install-fresh-os-root.4192993/)
- [GitHub - Sunmi V2 Firmware Repurposing](https://github.com/dafish7/Sunmi-v2-Firmware-)
- [Reverse Engineering Blog Post](https://lena.nihil.gay/blog/sunmi-v2-reverse-engineering)
- [Medium - Android App Dev on Sunmi V2](https://medium.com/@shakibaenur/android-app-development-with-sunmi-v2-pos-device-9b129c09577d)
- [Flutter SDK](https://pub.dev/packages/sunmi_printer_plus)

**Why it's the best pick:**
1. Cheapest Android POS with printer ($80-120)
2. Most hackable -- root available, USB debug wide open, active XDA community
3. Second-hand units from GrabFood/Deliveroo are even cheaper
4. Official SDK makes printer control trivial
5. WiFi built-in, no wiring needed
6. Counter-ready form factor

---

### 2. Sunmi V2s -- Upgraded V2

Same form factor as V2 but upgraded internals.

**Key differences from V2:**
- CPU: Quad-core 2.0GHz (vs 1.3GHz)
- RAM: 2GB standard (3GB optional)
- Storage: 16GB (32GB optional)
- Supports both receipt AND label printing
- Reinforced drop protection (1.2m)
- Detachable 3500mAh 7.7V battery

**Price:** $120-160 on AliExpress, THB 5,500 on Lazada TH (3GB/32GB variant)

**Hackability:** Same platform as V2, same root methods likely apply. Sunmi SDK works identically.

**Verdict:** Worth the extra $30-40 over V2 for the RAM/storage bump if buying new. But used V2 units are significantly cheaper.

---

### 3. MUNBYN Android POS Terminals

MUNBYN makes two relevant Android POS terminals:

**MUNBYN IPDA045 (5" screen):**
- Android 10 (newer than Sunmi V2!)
- 58mm thermal printer built-in
- NFC, WiFi, 3G, Bluetooth
- 5-inch touchscreen
- **Google Play Store built-in** -- can install apps directly
- Camera + barcode scanner
- Works with Loyverse, iREAP, CashStock
- $100-150 on Amazon/AliExpress

**MUNBYN 6" PDA (B09BJT37NQ):**
- Android 10
- 58mm printer, 80mm/s print speed
- Dual-band WiFi (2.4GHz + 5GHz)
- 4G LTE, NFC, Bluetooth
- 6-inch full touch display
- Google Play built-in
- Free SDK for custom app development
- $120-160 on Amazon

**Pros over Sunmi V2:**
- Android 10 (vs 7.1) -- better library compatibility
- Google Play built-in (easier app deployment)
- Dual-band WiFi (5GHz support)

**Cons vs Sunmi V2:**
- Less hackability documentation (no XDA threads)
- Slightly more expensive
- Less established in the maker/hacker community
- May have stricter app installation policies

**Links:**
- [Amazon - MUNBYN IPDA045](https://www.amazon.com/Android-Terminal-MUNBYN-Thermal-Bluetooth/dp/B07NRWD5NL)
- [Amazon - MUNBYN 6" PDA](https://www.amazon.com/MUNBYN-Terminal-Handheld-Bluetooth-Loyverse/dp/B09BJT37NQ)

---

### 4. iMin D1 -- Desktop POS

Full desktop POS terminal with larger screen and dual displays.

**Specs:**
- Android 11
- Octa-core processor
- 2GB RAM + 16GB storage
- 10.1" main display + 2.4" customer display
- 58mm built-in printer (100mm/s)
- WiFi + 4G + Bluetooth + Ethernet
- NFC reader
- Barcode scanner (optional)
- RJ11 cash drawer port

**Price:** $200-300 -- significantly more expensive

**Verdict:** Overkill for a WiFi code printer. The big screen and dual display are wasted. But if you want a counter device that does multiple things (POS + WiFi codes), it's polished.

**Links:**
- [iMin D1 Product Page](https://www.imin.com/product/d1/)
- [iMin Developer Docs](https://oss-sg.imin.sg/docs/en/index.html)

---

### 5. iMin Swift 2 -- Latest Android

Handheld POS running the newest Android.

**Specs:**
- **Android 13** -- newest OS of any device here
- 6.5" display
- 58mm built-in printer
- WiFi + 4G + Bluetooth
- Removable battery
- Google Play support

**Price:** $150-200

**Verdict:** Best if you want maximum Android compatibility and latest security patches. But less hackability documentation than Sunmi.

**Links:**
- [iMin Swift 2 Product Page](https://www.imin.com/product/swift-2/)
- [UK Reseller](https://www.pos-hardware.co.uk/products/imin-swift-2-handheld-android-13-pos-terminal)

---

### 6. Generic AliExpress Android POS Terminals

There's a flood of unbranded/white-label Android POS terminals on AliExpress in the $50-100 range:

**Common specs:**
- Android 8.1-12
- Quad-core, 1-2GB RAM, 8-16GB storage
- 58mm thermal printer
- WiFi + Bluetooth (4G on some)
- 5-6" touchscreen
- $50-100

**Search terms:**
- "Android POS terminal printer WiFi" -- [AliExpress search](https://www.aliexpress.com/w/wholesale-android-pos-printer.html)
- "PDA POS handheld thermal printer 58mm WiFi Android" -- [AliExpress listing ~$105](https://www.aliexpress.com/item/32905823954.html)

**Brands to look for:** SMAJAYU, ISSYZONEPOS, Goodcom, NETUM, Yoidesu

**Pros:** Cheapest option ($50-80 for basic models)\
**Cons:** Unknown firmware restrictions, poor documentation, no developer community, quality varies wildly, may be locked to specific POS apps

**Verdict:** Risky. You might get a perfectly hackable Android device for $60, or you might get a bricked doorstop locked to some Chinese POS system. The Sunmi V2 is worth the extra $20-40 for the known-good hackability.

---

## The Auto-Cutter Problem

**Bad news:** Almost NO handheld Android POS terminal has an auto-cutter. The 58mm form factor doesn't support it -- there's no room for a cutting mechanism in the compact body.

**Auto-cutters are only on:**
- 80mm desktop cloud printers (Category 2 -- no Android)
- Desktop POS terminals like Sunmi T2 (80mm option) -- but $300-500
- Bare printer modules (our original ESP32 approach)

**For the WiFi code printer use case:** Manual tear-off on the V2 is acceptable. You're printing maybe 5-20 receipts a day. The V2 has a tearing edge on the paper output. It's not elegant but it works.

**If auto-cutter is a must:**
- Go back to the ESP32 + GOOJPRT auto-cutter approach ($35-50 for just the printer module)
- Or use a desktop POS like Sunmi T2 Mini ($300+, overkill)

---

## QR Code Printing

All of these devices print QR codes natively via ESC/POS commands. The Sunmi SDK makes it trivial:

```kotlin
// Sunmi SDK - print QR code
val sunmiPrinterService = ... // bind to AIDL service
sunmiPrinterService.printQRCode("WIFI:T:WPA;S:FIKA-Guest;P:voucher123;;",
    moduleSize = 8,
    errorLevel = 1) // 0=L, 1=M, 2=Q, 3=H
```

Flutter/React Native wrappers exist too. This is a solved problem on Sunmi devices.

---

## Physical Button Reprogramming

### Sunmi V2 Button Mapping

The V2 has 3 physical buttons (Volume Up, Volume Down, Power). In a custom Android app:

```kotlin
// Override volume buttons in your Activity
override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    when (keyCode) {
        KeyEvent.KEYCODE_VOLUME_UP -> {
            printWifiVoucher(duration = "1_day")
            return true
        }
        KeyEvent.KEYCODE_VOLUME_DOWN -> {
            printWifiVoucher(duration = "1_week")
            return true
        }
    }
    return super.onKeyDown(keyCode, event)
}
```

**Mapping for WiFi code printer:**

| Physical Button | Android KeyCode | WiFi Voucher Action |
|----------------|-----------------|---------------------|
| Volume Up | KEYCODE_VOLUME_UP | 1-day pass |
| Volume Down | KEYCODE_VOLUME_DOWN | 1-week pass |
| Screen tap (big button on screen) | OnClickListener | 1-month pass |

Two physical buttons + one big on-screen button = three duration options. Works perfectly.

With root access, you could even remap Power button long-press, but that's unnecessary.

---

## Recommendation

### Best Option: Used Sunmi V2 ($60-80)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  PICK: Sunmi V2 (used/refurb from GrabFood/Deliveroo)              ┃
┃                                                                    ┃
┃  Why:                                                              ┃
┃  - Android device, install any APK                                 ┃
┃  - Built-in 58mm printer with SDK                                  ┃
┃  - WiFi + physical buttons + screen                                ┃
┃  - Active hacker community (XDA, GitHub)                           ┃
┃  - Root available if needed                                        ┃
┃  - Flood of cheap used units on market                             ┃
┃  - Zero wiring, zero enclosure design                              ┃
┃  - Write a Kotlin/Flutter app, deploy via ADB, done                ┃
┃                                                                    ┃
┃  Trade-offs:                                                       ┃
┃  - No auto-cutter (manual tear-off)                                ┃
┃  - Android 7.1 is getting old                                      ┃
┃  - Overkill hardware (screen, 4G, camera not needed)               ┃
┃  - Form factor is "handheld PDA" not "counter box"                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Where to Buy in Thailand

| Source | Model | Price | Notes |
|--------|-------|-------|-------|
| Lazada TH | Sunmi V2s (3GB/32GB) | THB 5,500 | New, official Thai seller |
| AliExpress | Sunmi V2 | $80-120 | New, 2-3 week shipping |
| AliExpress | Sunmi V2 Pro/V2s Plus | $158 (23% off) | 80mm print option |
| Facebook Marketplace TH | Used Sunmi V2 | THB 1,500-3,000 | Ex-GrabFood/Deliveroo units |
| Shopee TH | Sunmi V2 | THB 4,500-6,000 | Search "Sunmi V2" |
| eBay | Sunmi V2 refurb | $60-100 | International shipping |

**Pro tip:** Search Facebook Marketplace and Thai second-hand groups for "Sunmi" or "POS printer GrabFood". GrabFood Thailand retired a bunch of V2 units -- they sell for THB 1,500-3,000 used.

### Development Approach

1. Get a Sunmi V2 (used is fine)
2. Enable Developer Mode (Settings > About > Build Number x7)
3. Enable USB Debugging
4. Enable Unknown Sources (Security > Device Admin)
5. Write a simple Android app (Kotlin or Flutter):
   - Bind to Sunmi printer AIDL service
   - Listen for volume button KeyEvents
   - HTTPS POST to UniFi voucher API
   - Format and print receipt with QR code
6. Install via `adb install app.apk`
7. Set app as kiosk/launcher (lock it to the screen)
8. Put it on the counter. Done.

### Hybrid Approach (Best of Both Worlds)

If auto-cutter is important, consider a hybrid:

- **Sunmi V2** as the brains (WiFi, API calls, button input, display)
- **External 80mm USB printer with auto-cutter** connected via USB-OTG
- The V2 runs the app and sends ESC/POS commands to the external printer
- Gets you auto-cutter + Android flexibility

This is more complex but gives you everything.

---

## Comparison: Android POS vs ESP32 Approach

| Factor | Sunmi V2 (Android) | ESP32 + Bare Printer |
|--------|--------------------|--------------------|
| Price (prototype) | $60-120 | $30-50 |
| Wiring required | None | Yes (UART, buttons, power) |
| Enclosure | Built-in | DIY / 3D print |
| Auto-cutter | No (58mm) | Available ($35-50 extra) |
| Programming | Kotlin/Flutter APK | C++ Arduino/PlatformIO |
| QR code printing | SDK, trivial | ESC/POS or bitmap |
| WiFi setup | Android WiFi settings | WiFiManager or hardcoded |
| OTA updates | ADB over network, Play Store | ArduinoOTA |
| Screen feedback | 5.45" touchscreen | LED only (or add OLED) |
| Buttons | 2 physical + touchscreen | 3 GPIO buttons |
| Hackability | Android SDK + root | Full hardware control |
| Reliability | Proven restaurant-grade | DIY, your soldering |
| Time to first print | 1 day (software only) | 1-3 weeks (hardware + software) |

**Bottom line:** If you want it working FAST with zero hardware work, the Sunmi V2 wins. If you want auto-cutter and full hardware control, the ESP32 approach wins.

---

## Sources

- [Sunmi V2s Product Page](https://www.sunmi.com/en/v2s/)
- [Sunmi 80mm Cloud Printer](https://www.sunmi.com/en/80-kitchen-cloud-printer/)
- [Sunmi Developer Portal](https://developer.sunmi.com/docs/en-US/index)
- [Sunmi T2 Mini on Alibaba](https://sunmi.en.alibaba.com/product/60796825202-807406208/)
- [XDA Forums - Sunmi V2 Root/Firmware](https://xdaforums.com/t/firmware-root-method-sunmi-v2.4531909/)
- [XDA Forums - Sunmi V2 Unblock](https://xdaforums.com/t/sunmi-v2-unblock-install-fresh-os-root.4192993/)
- [GitHub - Sunmi V2 Firmware Repurposing (Deliveroo)](https://github.com/dafish7/Sunmi-v2-Firmware-)
- [Lena's Blog - Sunmi V2 Reverse Engineering](https://lena.nihil.gay/blog/sunmi-v2-reverse-engineering)
- [MUNBYN IPDA045 on Amazon](https://www.amazon.com/Android-Terminal-MUNBYN-Thermal-Bluetooth/dp/B07NRWD5NL)
- [MUNBYN 6" PDA on Amazon](https://www.amazon.com/MUNBYN-Terminal-Handheld-Bluetooth-Loyverse/dp/B09BJT37NQ)
- [iMin D1 Product Page](https://www.imin.com/product/d1/)
- [iMin Swift 2 Product Page](https://www.imin.com/product/swift-2/)
- [iMin Developer Documentation](https://oss-sg.imin.sg/docs/en/index.html)
- [HPRT TP80NY Cloud Printer](https://www.hprt.com/Product/Thermal-Receipt-Cloud-Printer-TP80NY.html)
- [Rongta ACE V1](https://www.helptechco.com/content/ACE-V1)
- [Sunmi Flutter SDK](https://pub.dev/packages/sunmi_printer_plus)
- [AliExpress - Android POS Printers](https://www.aliexpress.com/w/wholesale-android-pos-printer.html)
- [AliExpress - Sunmi V2](https://www.aliexpress.com/w/wholesale-sunmi-v2.html)
- [Lazada TH - Sunmi V2](https://www.lazada.co.th/tag/sunmi-v2/)
- [Sunmi Debugging Devices Documentation](https://docs.sunmi.com/en/docking-debugging/debugging-devices/)
- [Sunmi Enable USB Debugging](https://developer.sunmi.com/docs/en-US/cdixeghjk491/xdrzeghjk557/)

---

*Maintained by Bender - "I'll build my own WiFi printer! With blackjack! And hookers!"*
