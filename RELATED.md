# Related Projects

## ThermalMarky
https://github.com/sadreck/ThermalMarky

Python web app + CLI that renders Markdown-like syntax to thermal receipt printers via `python-escpos`. FastAPI web UI, Dockerized, TCP:9100. Supports bold, headers, alignment, QR codes, word-wrapping, auto-cut.

**Adjacent, not directly useful.** Same domain (thermal receipt printing over network) but operates at the application layer only. No raw ESC/POS, no vendor config, no buzzer control. Could borrow the markdown-to-receipt pattern if we ever want a "print any message" feature.

## python-escpos
https://github.com/python-escpos/python-escpos

The library ThermalMarky uses. Mature Python ESC/POS implementation with USB/network/serial support. Worth checking if it has any Xprinter-specific driver code.

## dantecatalfamo/xprinter-wifi
https://github.com/dantecatalfamo/xprinter-wifi

Ruby tool for configuring Xprinter WiFi via USB. Reverse-engineered the `1F 1B 1F B4` vendor protocol by sniffing the Windows utility under Wine with Wireshark. Our PRINTER-SETTINGS.md WiFi section is based on this work.

Blog post: https://blog.lambda.cx/posts/xprinter-wifi/

## kunif/EscPosUtils
https://github.com/kunif/EscPosUtils

C# library with the most complete GS(E) command decoder found. Used to map all 24 function codes, memory switch format, customized setting ranges, and buzzer pattern protocol. Our EEPROM settings documentation draws heavily from this.

## Xprinter SDK repos

| Repo | What | Useful for |
|------|------|-----------|
| `jash-git/xprinter_Windows_SDK` | Full Windows SDK v2.0.3 with headers + DLLs | C header confirms no buzzer export in DLL API |
| `rjgcs/libPrinterSDK` | iOS SDK with `POSCommand.h` (732 lines) | Most complete method interface, declares `setBeeper(BOOL)` |
| `atishoo/xprinter_sdk` | iOS SDK with `POSCommand.h` + `ESC C` docs | Buzzer + alarm light command format |
| `eatme-global/react-native-pos-thermal-printer` | iOS `PosCommand.m` implementation | Raw bytes for ESC B and ESC C buzzer commands |
| `rarebek/cheque-print-bridge` | iOS wrapper with DIP settings | DIP hex string format with beeper bit |
