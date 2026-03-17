# Xprinter XP-C300H - Settings Reference

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  FIKA Printer: fika-printer / 172.20.7.159                                    ┃
┃  MAC (LAN): 00:7b:a2:68:de:af  |  MAC (WiFi): 38:3a:21:29:40:fa             ┃
┃  Protocol: ESC/POS over TCP/9100  |  Web UI: http://fika-printer (HTTP/0.9)  ┃
┃  Font A: 48 chars/line (12x24)   |  Font B: 64 chars/line (9x17)            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Web UI Pages

The web config runs on port 80 (HTTP/0.9 -- use `curl --http0.9` from terminal).

| Page | URL | Purpose |
|------|-----|---------|
| Information | `/ip_info.htm` | MAC, IP, subnet, gateway, DHCP status (read-only) |
| Configuration | `/ip_config.htm` | Change IP/subnet/gateway/DHCP settings |
| Printer Status | `/prt_status.htm` | Live status (auto-refreshes every 5s) |
| Print Test | `/prt_test.htm` | Send text or hex to printer (max 1024 chars) |
| Restart | `/reset_prt.htm` | Reboot the printer |

> [!WARNING]
> **No authentication.** Anyone on the LAN can access the web UI, change the IP, or restart the printer. Keep the network secure.

### Status Indicators (`/prt_status.htm`)

| Indicator | Current | Meaning |
|-----------|---------|---------|
| Cover Is Open | No | Paper cover not latched |
| Cutter Error | No | Auto-cutter jammed |
| Paper End | No | Paper roll empty |
| Paper Near End | No | Paper running low (sensor) |
| Printer Off-Line | No | Printer not accepting data |

### Print Test Page (`/prt_test.htm`)

Three buttons:
- **Cash Open** -- opens the cash drawer (RJ11 port)
- **Cutter Paper** -- triggers auto-cutter
- **Print Test** -- prints content from the text area (max 1024 chars, optional HEX mode)

---

## Network Settings

> [!CAUTION]
> Changing IP settings can make the printer unreachable. You'll need physical access (same subnet trick with `ifconfig alias`) to recover.

### Current Config

| Setting | Value |
|---------|-------|
| Mode | Fixed IP (static) |
| IP Address | `172.20.7.159` |
| Subnet Mask | `255.255.255.0` |
| Gateway | `172.20.7.1` |
| DHCP | Disabled |
| DNS | `fika-printer` (UniFi local DNS) |

### Change via curl

```bash
# DANGEROUS: Set static IP (printer unreachable until you're on that subnet)
curl --http0.9 "http://fika-printer/ip_config.htm?dhcp_mode=0&IP_1=172&IP_2=20&IP_3=7&IP_4=159&MASK_1=255&MASK_2=255&MASK_3=255&MASK_4=0&GW_IP_1=172&GW_IP_2=20&GW_IP_3=7&GW_IP_4=1&save=Save"

# Enable DHCP (IP will change -- update DNS after reboot)
curl --http0.9 "http://fika-printer/ip_config.htm?dhcp_mode=1&DHCP_time=90&save=Save"

# Reboot (required after config change)
curl --http0.9 "http://fika-printer/reset_prt.htm?reboot=Restart"
```

### Recovery (if printer becomes unreachable)

```bash
# Add a temporary IP alias on your Mac to reach the printer's subnet
sudo ifconfig en0 alias 192.168.123.1 netmask 255.255.255.0

# Now you can reach the default IP
curl --http0.9 "http://192.168.123.100/ip_config.htm"

# Reconfigure, then remove the alias
sudo ifconfig en0 -alias 192.168.123.1
```

Factory default: `192.168.123.100`, DHCP disabled.

---

## ESC/POS Commands (TCP/9100)

Send raw bytes to `fika-printer:9100` via netcat or TCP socket.

### Basic Commands

| Command | Hex | Effect |
|---------|-----|--------|
| **Initialize** | `1B 40` | Reset printer to defaults. Always send first. |
| **Line feed** | `0A` | Advance one line |
| **Print & feed** | `1B 64 n` | Print buffer + feed `n` lines |
| **Cut paper** | `1D 56 42 03` | Partial cut with 3-line feed |
| **Full cut** | `1D 56 00` | Full cut (no feed) |

### Text Formatting

| Command | Hex | Effect |
|---------|-----|--------|
| **Bold on** | `1B 45 01` | Enable bold |
| **Bold off** | `1B 45 00` | Disable bold |
| **Underline on** | `1B 2D 01` | 1-dot underline |
| **Underline off** | `1B 2D 00` | Disable underline |
| **Double height** | `1D 21 01` | Double-height text |
| **Double width** | `1D 21 10` | Double-width text |
| **Double both** | `1D 21 11` | Double height + width |
| **Normal size** | `1D 21 00` | Reset to normal |
| **Align left** | `1B 61 00` | Left-align |
| **Align center** | `1B 61 01` | Center-align |
| **Align right** | `1B 61 02` | Right-align |
| **Invert on** | `1D 42 01` | White on black |
| **Invert off** | `1D 42 00` | Normal |

### Character Width (verified)

| Font | Command | Dot size | Chars/line | Best for |
|------|---------|----------|------------|----------|
| **Font A** | `1B 4D 00` | 12x24 | **48** | Default, receipts, readable |
| **Font B** | `1B 4D 01` | 9x17 | **64** | Fine print, disclaimers |
| **Double-width A** | `1D 21 10` | 24x24 | **24** | Headers, emphasis |
| **Double-width B** | `1D 21 10` + Font B | 18x17 | **32** | Wide fine print |
| **Double-both A** | `1D 21 11` | 24x48 | **24** | Big headers |

> [!TIP]
> When formatting receipt lines, wrap text at **48 chars** (Font A) or **64 chars** (Font B). The printer auto-wraps but it breaks mid-word -- manual line breaks look much cleaner.

### Print Density

| Command | Hex | Effect |
|---------|-----|--------|
| **Set density** | `1D 7C n` | `n` = 0-8, where 4 is default. Higher = darker. |

> [!TIP]
> Start with density 4 (default). Increase to 5-6 if prints are too light. Going above 7 wastes heat and wears the print head faster.

### Print Speed

| Command | Hex | Effect |
|---------|-----|--------|
| **Set speed** | `1D 73 n` | `n` = 0-3. 0 = fastest, 3 = slowest (better quality). |

### Character Settings

| Command | Hex | Effect |
|---------|-----|--------|
| **Code page** | `1B 74 n` | Set character table. `n=0`: PC437, `n=16`: WPC1252 (Western Europe) |
| **Chinese mode on** | `1C 26` | Enable Chinese character mode |
| **Chinese mode off** | `1C 2E` | Disable Chinese character mode |

### Cash Drawer

| Command | Hex | Effect |
|---------|-----|--------|
| **Open drawer pin 2** | `1B 70 00 19 FF` | Pulse pin 2 (standard) |
| **Open drawer pin 5** | `1B 70 01 19 FF` | Pulse pin 5 (secondary) |

### Buzzer

#### Triggering Beeps (volatile - per command)

| Command | Hex | Effect |
|---------|-----|--------|
| **Beep** | `1B 42 n t` | Beep `n` times (1-9), `t` x 50ms duration each (1-9) |
| **Beep + light** | `1B 43 m t n` | `m` times (1-20), `t` x 50ms interval, `n`: 0=none 1=beep 2=flash 3=both |

Examples:
```bash
printf '\x1b\x42\x03\x02' | nc -w 1 fika-printer 9100   # 3 beeps, 100ms each
printf '\x1b\x43\x02\x04\x01' | nc -w 1 fika-printer 9100  # 2 beeps, 200ms interval
```

#### Runtime Buzzer Control (ESC ( A) -- volatile, per-session

| Command | Hex | Effect |
|---------|-----|--------|
| **Trigger pattern** | `1B 28 41 04 00 30 pp rr dd` | Pattern `pp` (0x30-0x3A), repeat `rr` (0-63), duration `dd` (10-255 x 100ms) |
| **Named pattern** | `1B 28 41 03 00 61 tt cc` | Pattern A-E/Error/PaperEnd, count `cc` |
| **Offline buzzer** | `1B 28 41 07 00 62 ...` | Buzzer on cover/paper/error events |
| **Near-end buzzer** | `1B 28 41 07 00 63 ...` | Buzzer when paper running low |

Pattern frequencies (from Epson APG):

| Pattern byte | Frequency | Duration |
|-------------|-----------|----------|
| `0x30` | Silent | - |
| `0x31` | 1320 Hz | 1000ms |
| `0x32` | 2490 Hz | 1000ms |
| `0x33` | 1320 Hz | 200ms |
| `0x34` | 2490 Hz | 200ms |
| `0x35` | 1320 Hz | 200ms on/off/on |
| `0x36` | 2490 Hz | 200ms on/off/on |
| `0x37` | 1320 Hz | 500ms |
| `0x38` | 2490 Hz | 500ms |
| `0x39` | 1320 Hz | triple 200ms |
| `0x3A` | 2490 Hz | triple 200ms |

#### Disabling the Buzzer (persistent EEPROM)

The printer beeps on power-on and after every print job. Methods to shut it up, from easiest to nuclear:

##### Method 0: Xprinter Vendor Protocol (1F 1B 1F) -- MOST LIKELY TO WORK

Xprinter uses a **proprietary command prefix** `1F 1B 1F` (US ESC US) for all hardware configuration. This is the same protocol used for WiFi config, density, print width, etc. The `13 14` bytes are a magic marker/authentication prefix.

> [!WARNING]
> **Transport matters!** The `1F 1B 1F` vendor commands work over both USB and TCP/9100 -- HOWEVER, some config changes (WiFi specifically) are **USB-only** (accepted but silently ignored over TCP). Buzzer/cutter alarm has not been confirmed on a specific transport. If sending over TCP has no effect, try USB.

> [!TIP]
> **USB connection:** Connect USB-B cable, verify with `ioreg -p IOUSB -w0 | grep -i printer` (should show `Printer-80` VID=0x1FC9 PID=0x2016). Use `pyusb` to write to OUT endpoint `0x02`. See WiFi module section for the Python script approach.

**Disable cutter alarm (beep after cut):**
```
1F 1B 1F E0 13 14 00 04 02 03
```

**Disable beep on print:**
```
1F 1B 1F E0 13 14 00 05 05 01
```

**Enable cutter alarm (restore beep):**
```
1F 1B 1F E0 13 14 01 04 02 03
```

**Other known vendor commands:**

| Command | Hex | Effect |
|---------|-----|--------|
| Factory reset | `1F 1B 1F 11 11 00` | **DANGEROUS** -- resets everything including IP! |
| Print density | `1F 1B 1F 13 14 nn` | `nn` = 01-08 (08=darkest) |
| Print width | `1F 1B 1F E1 13 14 nn` | 00=72mm, 02=80mm, 03=48mm |
| Baud rate | `1F 1B 1F DF nn` | 01=9600, 05=115200 |
| Peel mode on | `1F 1B 1F BC 13 14 01` | Enable label peel |
| Peel mode off | `1F 1B 1F BC 13 14 00` | Disable label peel |

Use `bun buzzer-config.ts disable` to send via TCP, or `bun buzzer-config.ts disable --usb` for USB (if implemented).

**Tool usage:**
```bash
bun buzzer-config.ts --dry-run disable   # Show bytes, send nothing
bun buzzer-config.ts disable             # Send vendor commands via TCP
bun buzzer-config.ts disable --epson     # Try Epson GS(E) protocol instead
bun buzzer-config.ts status              # DLE EOT status (read-only, safe)
```

> [!NOTE]
> **GS(E) read commands return nothing on this printer.** The XP-C300H does not implement the Epson `GS ( E` transmit/read functions (fn=0x04, fn=0x06). DLE EOT status queries (0x10 0x04) DO work -- confirmed `0x12` response for offline status. Writes may still work via GS(E), but we can't verify settings -- only test by printing.

##### Method 1: GS ( E Customized Settings (over TCP -- Epson standard fallback)

The Epson ESC/POS standard defines buzzer on/off as **customized setting `a=119` (0x77)**. This is what the Xprinter Windows utility likely sends internally as "P76 Buzzer Set" (Xprinter's P-numbers != Epson's `a` numbers).

**Buzzer-related settings (Epson `a` numbers):**

| `a` | Hex | Setting | Values |
|-----|-----|---------|--------|
| **119** | `0x77` | **Buzzer enable/disable** | **0=disabled**, 1=enabled |
| **120** | `0x78` | Buzzer repeat on error | 0=no sound, 1+=repeat count, 65535=continuous |
| **121** | `0x79` | Buzzer pattern on autocut | 1-5 = patterns A-E |
| **122** | `0x7A` | Buzzer repeat on autocut | 0=no sound, 1+=repeat count |
| **123** | `0x7B` | Buzzer pattern on pulse 1 | 1-5 = patterns A-E |
| **124** | `0x7C` | Buzzer repeat on pulse 1 | 0=no sound, 1+=repeat count |
| **125** | `0x7D` | Buzzer pattern on pulse 2 | 1-5 = patterns A-E |
| **126** | `0x7E` | Buzzer repeat on pulse 2 | 0=no sound, 1+=repeat count |

**Protocol to write EEPROM settings:**

```
1. Enter user setting mode:  1D 28 45 03 00 01 49 4E
2. Write setting(s):         1D 28 45 [pL] [pH] 05 [a] [nL] [nH] ...
3. Exit + soft reset:        1D 28 45 04 00 02 4F 55 54
```

The exit command triggers a soft reset (printer reinitializes).

**To read current setting value:**
```
1D 28 45 02 00 06 [a]
Response: 37 23 [a] [nL] [nH] 00
```

**Full disable sequence (disable buzzer + silence all events):**

```bash
# DO NOT RUN without understanding -- writes to EEPROM (limited write cycles!)
# Build the command sequence:
{
  # Enter user setting mode
  printf '\x1d\x28\x45\x03\x00\x01\x49\x4e'
  # Set a=119 (buzzer enable) to 0 (disabled)
  printf '\x1d\x28\x45\x04\x00\x05\x77\x00\x00'
  # Set a=120 (error buzzer repeat) to 0 (no sound)
  printf '\x1d\x28\x45\x04\x00\x05\x78\x00\x00'
  # Set a=122 (autocut buzzer repeat) to 0 (no sound)
  printf '\x1d\x28\x45\x04\x00\x05\x7a\x00\x00'
  # Set a=124 (pulse 1 buzzer repeat) to 0 (no sound)
  printf '\x1d\x28\x45\x04\x00\x05\x7c\x00\x00'
  # Set a=126 (pulse 2 buzzer repeat) to 0 (no sound)
  printf '\x1d\x28\x45\x04\x00\x05\x7e\x00\x00'
  # Exit user setting mode (triggers soft reset)
  printf '\x1d\x28\x45\x04\x00\x02\x4f\x55\x54'
} | nc -w 10 fika-printer 9100
```

> [!WARNING]
> **NV EEPROM has limited write cycles (~100K total, Epson recommends max 10 writes/day).** Don't loop this. Write once, verify, done.

> [!IMPORTANT]
> **Xprinter's "P76" is NOT Epson's `a=76`.** Xprinter remaps the P-numbers in their utility. The actual Epson parameter for buzzer enable/disable is `a=119` (0x77). If `a=119` doesn't work on this clone, try common Xprinter-specific values -- see the alternative methods below.

##### Method 2: Silent Buzzer Patterns via GS ( E fn=0x63

Instead of disabling the buzzer, set all 5 patterns (A-E) to silent:

```
1D 28 45 pL pH 63 [pattern_id] [c1 d1] [c2 d2] [c3 d3] [c4 d4] [c5 d5] [c6 d6]
```

Each pattern = 13 bytes: 1 byte ID + 6 pairs of (sound: 0=off/1=on, duration: 0-100 x 100ms).

**Set all patterns to silent:**
```bash
{
  printf '\x1d\x28\x45\x03\x00\x01\x49\x4e'  # Enter settings
  # Pattern A (1): all off
  printf '\x1d\x28\x45\x0e\x00\x63\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
  # Pattern B (2): all off
  printf '\x1d\x28\x45\x0e\x00\x63\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
  # Pattern C (3): all off
  printf '\x1d\x28\x45\x0e\x00\x63\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
  # Pattern D (4): all off
  printf '\x1d\x28\x45\x0e\x00\x63\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
  # Pattern E (5): all off
  printf '\x1d\x28\x45\x0e\x00\x63\x05\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
  printf '\x1d\x28\x45\x04\x00\x02\x4f\x55\x54'  # Exit settings
} | nc -w 10 fika-printer 9100
```

##### Method 3: Persistence via GS ( M (save/load)

Some clones ignore the GS(E) exit-saves-to-NV behavior. Use explicit save:

| Command | Hex | Effect |
|---------|-----|--------|
| **Save to NV** | `1D 28 4D 02 00 31 31` | Save current working settings to NV storage |
| **Load saved** | `1D 28 4D 02 00 32 31` | Load saved settings (0x31) from NV |
| **Load factory** | `1D 28 4D 02 00 32 30` | Load factory defaults (0x30) |
| **Boot = saved** | `1D 28 4D 02 00 33 31` | On boot, load saved settings |
| **Boot = factory** | `1D 28 4D 02 00 33 30` | On boot, load factory defaults |

##### Method 4: Xprinter Windows Utility (P76 Buzzer Set)

1. Connect printer via USB to a Windows machine
2. Install **Xprinter V3.0C** configuration utility
3. Click **Advanced** -- find **P76 Buzzer Set** -- set to 0/disabled
4. Save to printer EEPROM

The utility internally sends `GS ( E` commands (same protocol as Method 1) but with Xprinter's own P-number mapping.

> [!TIP]
> The utility can run under **Wine** on macOS/Linux. The blog.lambda.cx author confirmed this for WiFi config. Worth trying for buzzer settings too.

##### Method 5: Disconnect the Buzzer (hardware)

Open the printer, locate the piezo buzzer on the PCB, unplug its connector. Permanent, irreversible without resoldering.

#### Other EEPROM Settings (GS ( E customized values)

While we're in the EEPROM, these are also useful:

| `a` | Hex | Setting | Values |
|-----|-----|---------|--------|
| 3 | `0x03` | Paper width | 2=58mm, 6=80mm |
| 5 | `0x05` | Print density | 65530-65535=light, 0=standard, 1-6=dark, 100=DIP switch |
| 6 | `0x06` | Print speed | 1-13 (1=slowest/best quality, 13=fastest) |
| 8 | `0x08` | Default code table | Per ESC t values |
| 9 | `0x09` | Default charset | Per ESC R values |
| 97 | `0x61` | Print head divisions | 1/2/4 (more = slower but cooler head) |
| 98 | `0x62` | Power supply output | 0=small, 1=medium, 2=large |
| 100 | `0x64` | Autocut after cover close | 0=disabled, 1=enabled |

#### Memory Switches (GS ( E fn=0x03)

8 switches (Msw1-Msw8), each with 8 bits. Notable:

| Switch | Bit | Function | 0=OFF | 1=ON |
|--------|-----|----------|-------|------|
| Msw1 | 8 | Power-on notice | Disabled | Enabled |
| Msw1 | 5 | BUSY when offline | Not BUSY | BUSY |
| Msw2 | 6 | Autocutter | Disabled | Enabled |
| Msw8 | 3 | **Beep settings** | Standard | Extended |

**Msw8 bit 3** might be another buzzer toggle -- "Standard" vs "Extended" beep behavior.

**Read memory switch:**
```bash
printf '\x1d\x28\x45\x02\x00\x04\x08' | nc -w 3 fika-printer 9100 | xxd
# Response: 37 21 [b8 b7 b6 b5 b4 b3 b2 b1] 00
# Each byte: 0x30 = OFF, 0x31 = ON
```

#### SDK Notes (reverse engineering)

The Xprinter SDK (`printer.sdk.dll`) is **native C/C++ -- NOT .NET**. Cannot be decompiled with ILSpy/dnSpy.

The iOS SDK (`POSCommand.h` in `rjgcs/libPrinterSDK`) declares `setBeeper(BOOL)`, `setCutterAndBeeper(count, interval)`, and `cancelCutterAndBeeper()` but the implementations are in a precompiled `.framework` binary.

The Android SDK (`.aar`) contains Java bytecode that IS decompilable -- potential future avenue if the standard GS(E) commands don't work on this clone.

### QR Code (Native)

The XP-C300H supports native QR code printing via `GS ( k`:

```bash
# Full QR code sequence:
# 1. Select model (Model 2)
printf '\x1d\x28\x6b\x04\x00\x31\x41\x32\x00'
# 2. Set module size (1-16, default 3)
printf '\x1d\x28\x6b\x03\x00\x31\x43\x06'
# 3. Set error correction (48=L, 49=M, 50=Q, 51=H)
printf '\x1d\x28\x6b\x03\x00\x31\x45\x31'
# 4. Store data (pL pH = data length + 3)
#    For "WIFI:T:WPA;S:FIKA-Guest;P:12345;;" (36 chars)
#    pL = (36+3) & 0xFF = 39, pH = 0
printf '\x1d\x28\x6b\x27\x00\x31\x50\x30WIFI:T:WPA;S:FIKA-Guest;P:12345;;'
# 5. Print stored QR
printf '\x1d\x28\x6b\x03\x00\x31\x51\x30'
```

| Parameter | Values | Recommended |
|-----------|--------|-------------|
| Model | 1 (Model 1), 2 (Model 2) | **2** |
| Module size | 1-16 dots | **6** (good size for 80mm) |
| Error correction | L (7%), M (15%), Q (25%), H (30%) | **M** (15% - good balance) |

### Barcode Printing

| Command | Hex | Effect |
|---------|-----|--------|
| **Set barcode height** | `1D 68 n` | Height in dots (default 162) |
| **Set barcode width** | `1D 77 n` | Width multiplier 2-6 (default 3) |
| **HRI position** | `1D 48 n` | 0=none, 1=above, 2=below, 3=both |
| **Print Code128** | `1D 6B 49 n [data]` | `n` = data length |

### Bitmap/Image Printing

| Command | Hex | Effect |
|---------|-----|--------|
| **Raster bit image** | `1D 76 30 m xL xH yL yH [data]` | Print bitmap. `m`: 0=normal, 1=double-width, 2=double-height, 3=both |

---

## Dangerous Operations

> [!CAUTION]
> These commands can brick, damage, or misconfigure the printer. Use with care.

| Operation | Risk Level | What Can Go Wrong |
|-----------|-----------|-------------------|
| **Change IP** (`/ip_config.htm`) | HIGH | Printer becomes unreachable. Need physical subnet trick to recover. |
| **Restore Default** (web UI button) | HIGH | Resets IP to `192.168.123.100` -- completely unreachable on 172.20.7.x network. |
| **Density > 7** (`1D 7C n`) | MEDIUM | Excessive heat. Degrades print head over time. Paper can stick/jam. |
| **Speed 0** (`1D 73 00`) | LOW | Fastest speed may reduce print quality. Not harmful. |
| **Chinese mode** (`1C 26`) | LOW | Garbles output if you're sending ASCII. Send `1C 2E` to disable. |
| **Flash write** (if supported) | HIGH | Writing to NV memory has limited write cycles (~100K). Don't loop. |
| **Firmware flash** | CRITICAL | No firmware upgrade via web UI. If Xprinter Windows utility bricks it, it's dead. |

---

## Quick Reference: Send Commands from CLI

```bash
# Initialize + print text + cut
echo -e '\x1b\x40Hello FIKA!\n\n\n\x1d\x56\x42\x03' | nc -w 3 fika-printer 9100

# Bold centered header
echo -e '\x1b\x40\x1b\x61\x01\x1b\x45\x01\x1d\x21\x11FIKA COFFEE\x1d\x21\x00\x1b\x45\x00\n\n\n\x1d\x56\x42\x03' | nc -w 3 fika-printer 9100

# Beep 2 times (no print)
printf '\x1b\x42\x02\x02' | nc -w 1 fika-printer 9100

# Open cash drawer
printf '\x1b\x70\x00\x19\xff' | nc -w 1 fika-printer 9100

# Check printer status via web
curl --http0.9 -s "http://fika-printer/prt_status.htm" | grep -oP '(?<=<TD style="width: 23px">)\w+'
```

## Self-Test Page (factory settings dump)

Hold the FEED button while powering on to print this page. Captured 2025/11/17 (factory state):

| Setting | Factory Value | Notes |
|---------|--------------|-------|
| Protocols | TCP/IP | |
| MAC address | 00-7B-A2-68-DE-AF | LAN MAC |
| IP address | 192.168.123.100 | Factory default |
| Net DHCP | Disabled | |
| Run mode | AP | WiFi in AP mode |
| SSID | Printer | AP broadcasts "Printer" |
| AP IP | 10.10.100.254 | |
| Wireless Model | LPT230-2M(2.4G) | HF-LPT230 confirmed |
| Cutter | Yes | Auto-cutter installed |
| **Beeper** | **Yes** | **Master buzzer toggle** |
| Barcode 2D Support | QRCODE, PDF417, DATAMATRIX | |
| USB Port mode | USB Printing | Not virtual COM |
| Cutter peel mode | Yes | Label peel enabled |
| **Cutter with Alarm** | **Yes** | **Beep after paper cut** |
| **Cutter idle Alarm** | **Yes** | **Beep when idle/timeout** |
| Black mark mode | No | |
| Density Level | 5 (Max=8) | Medium density |
| PaperEnd copy mode | No | |
| Char line FontA/B | 48/64 | Confirmed |
| **Printing width** | **72mm** | **Should be 80mm for our paper!** |
| Default ASCII FONT | FONTA | |
| Default code page | Page0 | |
| Chinese character | Yes | Enabled (wastes RAM) |
| Modify date | 2025/11/17 | Firmware date |

> [!IMPORTANT]
> **Three separate buzzer settings!** Disabling the buzzer requires turning off ALL THREE:\
> - **Beeper** -- master toggle\
> - **Cutter with Alarm** -- beep on every paper cut\
> - **Cutter idle Alarm** -- beep after idle timeout
>
> The vendor `1F 1B 1F E0` commands map to these. We may need three separate disable commands.

> [!WARNING]
> **Printing width is 72mm** (factory default) but we use 80mm paper. Change to 80mm: `1F 1B 1F E1 13 14 02`

---

## Printer Identity (probed via GS I)

The printer pretends to be an Epson. Classic Chinese clone move.

| Query | Command | Response | Meaning |
|-------|---------|----------|---------|
| Firmware | `GS I 67` | `8.00 ESC/POS` | Protocol version 8.00 |
| Emulation | `GS I 66` | `EPSON` | Epson-compatible mode |
| Model claim | `GS I 67` | `TM-T88III` | Claims to be a $400 Epson TM-T88III |
| Serial | `GS I 68` | `E2QG064874` | Unit serial number |
| Charset | `GS I 69` | `CHINA GB18030` | Chinese character encoding |

```bash
# Query identity
printf '\x1d\x49\x43' | nc -w 2 fika-printer 9100 | xxd  # firmware
printf '\x1d\x49\x42' | nc -w 2 fika-printer 9100 | xxd  # emulation
printf '\x1d\x49\x44' | nc -w 2 fika-printer 9100 | xxd  # serial
```

## Real-Time Status Monitoring (DLE EOT)

Query printer state without printing. Returns single status byte.

| Query | Command | Bit flags |
|-------|---------|-----------|
| Printer | `10 04 01` | bit 3: offline, bit 5: drawer open |
| Offline cause | `10 04 02` | bit 2: cover open, bit 3: feed pressed, bit 5: error |
| Error | `10 04 03` | bit 2: cutter error, bit 3: auto-recoverable, bit 5: auto-recovery failed |
| Paper | `10 04 04` | bit 2+3: near end, bit 5+6: paper end |

```bash
# Check paper status (0x12 = all good, 0x72 = paper near end, 0xF2 = paper out)
printf '\x10\x04\x04' | nc -w 2 fika-printer 9100 | xxd

# Full status check
for n in 01 02 03 04; do
  echo -n "Status $n: "
  printf "\x10\x04\x$n" | nc -w 2 fika-printer 9100 | xxd -p
done
```

> [!TIP]
> Use DLE EOT 4 (paper status) in the controller script to warn when paper is running low, before it runs out mid-print.

## Open Ports

| Port | Service | Status |
|------|---------|--------|
| **80** | Web UI (HTTP/0.9) | Active -- config, status, test print |
| **4000** | Unknown | Accepts connections, silent. Likely reserved for Windows utility. |
| **8080** | Unknown | Accepts connections, silent. Possibly future web UI or API. |
| **9100** | ESC/POS raw TCP | Active -- main print/query interface |

Ports 4000 and 8080 don't respond to HTTP, ESC/POS, or AT commands. Probably listener stubs for the Xprinter Windows configuration utility.

## WiFi Module (HF-LPT230)

The printer has a **separate WiFi module** (Hi-Flying HF-LPT230) with its own web UI, firmware, and dual MAC addresses. This module runs independently from the printer's ethernet interface.

### WiFi Module Identity

| Field | Value |
|-------|-------|
| Module | HF-LPT230 |
| Firmware | 4.13.35 (2022-12-20) |
| Web UI Version | 1.0.15 |
| STA MAC | `74:E9:D8:7C:AE:E6` |
| AP MAC | `70:E9:D8:7C:AE:E6` |
| AP Default SSID | `Printer` |
| AP Default IP | `10.10.100.254` |
| AP Default Password | `12345678` (when encryption enabled) |

> [!IMPORTANT]
> The WiFi module has **different MACs** from what UniFi initially saw (`38:3a:21:29:40:fa`). The STA MAC `74:E9:D8:7C:AE:E6` is the one that connects to your WiFi network.

### WiFi Web UI (the good one)

**URL:** `http://fika-printer/index_en.html`\
**Auth:** `admin` / `admin`

This is a completely separate web server from the old ethernet config UI. It appeared after the WiFi module was configured via USB and has **11 pages**:

| # | Page | URL | Purpose |
|---|------|-----|---------|
| 1 | System Info | `status_en.html` | Module ID, firmware, mode, IPs, MACs, signal strength |
| 2 | Mode Settings | `select_en.html` | Switch between AP, STA, or AP+STA mode |
| 3 | **STA Settings** | `wireless_en.html` | **WiFi client config** -- SSID, password, encryption, IP/DHCP |
| 4 | **AP Settings** | `wirepoint_en.html` | **Access point config** -- SSID, password, channel |
| 5 | Other Settings | `port_en.html` | Serial port params (baud rate) + network protocol (TCP/UDP port) |
| 6 | Account | `account_en.html` | Change web UI username/password |
| 7 | **Firmware Upgrade** | `update_en.html` | Upload new firmware! |
| 8 | Restart | `restart_en.html` | Reboot WiFi module |
| 9 | Factory Reset | `reset_en.html` | Reset WiFi module to defaults |
| 10 | WebSocket | `websocket_en.html` | WebSocket server/client config |
| 11 | Bonjour | `bonjour_en.html` | mDNS/Bonjour (currently off) |

> [!CAUTION]
> **Factory Reset** (page 9) resets the WiFi module to AP mode with default SSID "Printer" at `10.10.100.254`. You'd need to connect to its AP WiFi to reconfigure. Don't hit this unless you mean it.

> [!WARNING]
> **Firmware Upgrade** (page 7) -- only use official HF-LPT230 firmware. Wrong firmware = bricked WiFi module.

### Current WiFi Settings (STA mode)

| Setting | Value |
|---------|-------|
| Mode | STA (client) |
| SSID | `devices` |
| Auth | WPA2PSK |
| Encryption | AES |
| DHCP | Static |
| IP | `172.20.7.159` |
| Subnet | `255.255.255.0` |
| Gateway | `172.20.7.1` |
| Signal | 78% |

### Current Serial Port Settings

| Setting | Value |
|---------|-------|
| Baud Rate | 921600 |
| Data Bits | 8 |
| Parity | None |
| Stop Bits | 1 |
| CTS/RTS | Enabled |
| Protocol | TCP Server |
| Port | 9100 |
| TCP Timeout | 300s |

### WiFi Modes

| Mode | What it does |
|------|-------------|
| **STA** | Client only -- connects to your WiFi router (current mode) |
| **AP** | Access point only -- printer broadcasts its own WiFi network |
| **AP+STA** | Both -- connects to router AND broadcasts its own AP simultaneously |

### Reconfiguring WiFi (Two Methods)

#### Method 1: Web UI (easiest -- if printer is already on network)

1. Browse to `http://fika-printer/index_en.html` (login: `admin`/`admin`)
2. Click "STA Settings" (page 3)
3. Enter SSID, password, IP settings
4. Click "Scan" to find available networks
5. Save, then restart (page 8)

#### Method 2: USB + pyusb (when printer has no network access)

Use when deploying to a new location where you can't reach the web UI.

**Prerequisites:**
```bash
brew install libusb
```

**Steps:**

1. **Connect printer via USB** (USB-B port on printer)

2. **Verify it shows up:**
   ```bash
   ioreg -p IOUSB -w0 | grep -i printer
   # Should show: Printer-80  (VID=0x1FC9, PID=0x2016)
   ```

3. **Edit the config script** -- set SSID, password, IP:
   ```bash
   vi xprinter-wifi-config.py
   ```

4. **Run it:**
   ```bash
   uvx --with pyusb python xprinter-wifi-config.py
   ```

5. **Power cycle the printer** (unplug power, wait 5s, plug back in)

> [!IMPORTANT]
> The printer prefers LAN over WiFi. If both are connected, it uses LAN. Unplug the ethernet cable to force WiFi mode.

> [!WARNING]
> macOS does NOT create a `/dev` device file for this printer. The Ruby script from GitHub (`xprinter-wifi.rb`) expects `/dev/usb/lp0` (Linux only). Use the Python script with `pyusb` instead.

#### Method 3: Connect to printer's AP (when all else fails)

1. Factory reset the WiFi module (hold reset button or use page 9)
2. Connect your laptop to WiFi network `Printer` (open, no password)
3. Browse to `http://10.10.100.254` (login: `admin`/`admin`)
4. Configure STA settings from there

### USB Identity

| Field | Value |
|-------|-------|
| VID | `0x1FC9` (NXP Semiconductors) |
| PID | `0x2016` |
| Product | `Printer-80` |
| Serial | `05168CFCC15B` |
| USB Speed | Full Speed (12 Mbps) |
| OUT Endpoint | `0x02` |

### USB WiFi Protocol

Binary format (reverse-engineered by [dantecatalfamo](https://github.com/dantecatalfamo/xprinter-wifi)):

```
\x1f\x1b\x1f\xb4 + IP(4 bytes) + Mask(4 bytes) + Gateway(4 bytes) + KeyType(1 byte) + SSID\0 + Password\0
```

| Key Type | Encryption |
|----------|-----------|
| 0 | Open/None |
| 3 | WPA_AES_PSK |
| 6 | **WPA2_AES_PSK** (most common) |
| 8 | WPA2_TKIP_AES_PSK |
| 9 | WPA_WPA2_MixedMode |

### Two Web Servers, Two Worlds

The printer runs **two independent web servers** on port 80:

| Server | When Active | Style | Features |
|--------|------------|-------|----------|
| **Ethernet (J-Speed)** | LAN cable connected | Old-school HTML frames, HTTP/0.9 | IP config, printer status, test print, restart |
| **WiFi (HF-LPT230)** | WiFi configured | Modern-ish HTML, auth required | WiFi config, firmware upgrade, serial settings, WebSocket, Bonjour |

Which one you see depends on whether you're reaching the printer via LAN or WiFi. When both are connected, the LAN interface responds.

### Production Setup

- **Home (dev):** SSID `devices` / `YOUR_WIFI_PASSWORD` -- configured and verified 2026-03-13
- **FIKA (prod):** SSID `Fika - Devices` / `YOUR_WIFI_PASSWORD` -- IP TBD on FIKA subnet

---

*Maintained by Bender - "Bite my shiny metal receipt!"*
