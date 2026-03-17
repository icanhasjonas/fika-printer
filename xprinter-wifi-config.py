#!/usr/bin/env python3
"""
Xprinter WiFi configurator via USB (macOS/Linux)
Based on: https://github.com/dantecatalfamo/xprinter-wifi
Protocol: https://blog.lambda.cx/posts/xprinter-wifi/

Usage: uvx --with pyusb python xprinter-wifi-config.py

Requires: libusb (brew install libusb)
"""
import struct
import sys

try:
    import usb.core
    import usb.util
except ImportError:
    print("ERROR: pyusb not found. Run with: uvx --with pyusb python xprinter-wifi-config.py")
    sys.exit(1)

# ============================================================
# EDIT THESE VALUES FOR YOUR WIFI NETWORK
# ============================================================
SSID     = "CHANGEME"          # WiFi network name
PASSWORD = "CHANGEME"          # WiFi password
IP       = "192.168.1.100"    # Static IP for the printer
MASK     = "255.255.255.0"    # Subnet mask
GATEWAY  = "192.168.1.1"      # Gateway/router IP
KEY_TYPE = 6                   # 6 = WPA2_AES_PSK (most common)
# ============================================================

# Key types:
# 0 = Open/None
# 1 = WEP64
# 2 = WEP128
# 3 = WPA_AES_PSK
# 4 = WPA_TKIP_PSK
# 5 = WPA_TKIP_AES_PSK
# 6 = WPA2_AES_PSK (default, most common)
# 7 = WPA2_TKIP
# 8 = WPA2_TKIP_AES_PSK
# 9 = WPA_WPA2_MixedMode

# Xprinter USB identifiers
# VID 0x1FC9 (NXP) PID 0x2016 -- seen on our XP-C300H
# VID 0x0483 (STMicro) -- seen on other Xprinter models
KNOWN_VIDS = [0x1FC9, 0x0483, 0x1A86]
KNOWN_PIDS = [0x2016]

PREAMBLE = b'\x1f\x1b\x1f'
NETWORK_CMD = b'\xb4'


def ip_to_bytes(ip_str):
    """Convert dotted IP string to 4 bytes big-endian."""
    parts = ip_str.split('.')
    if len(parts) != 4:
        raise ValueError(f"Invalid IP: {ip_str}")
    return bytes(int(p) for p in parts)


def build_wifi_command(ip, mask, gateway, ssid, password, key_type=6):
    """Build the Xprinter WiFi configuration command."""
    cmd = PREAMBLE + NETWORK_CMD
    cmd += ip_to_bytes(ip)
    cmd += ip_to_bytes(mask)
    cmd += ip_to_bytes(gateway)
    cmd += bytes([key_type])
    cmd += ssid.encode('utf-8') + b'\x00'
    cmd += password.encode('utf-8') + b'\x00'
    return cmd


def find_printer():
    """Find the Xprinter USB device."""
    # Try known VIDs first
    for vid in KNOWN_VIDS:
        dev = usb.core.find(idVendor=vid)
        if dev:
            return dev

    # Fall back to searching by product name
    for dev in usb.core.find(find_all=True):
        try:
            product = usb.util.get_string(dev, dev.iProduct)
            if product and 'printer' in product.lower():
                return dev
        except (usb.core.USBError, ValueError):
            continue

    return None


def main():
    if SSID == "CHANGEME" or PASSWORD == "CHANGEME":
        print("ERROR: Edit this script and set SSID and PASSWORD first!")
        print(f"File: {__file__}")
        sys.exit(1)

    print("=== Xprinter WiFi Configuration ===")
    print(f"SSID:     {SSID}")
    print(f"IP:       {IP}")
    print(f"Mask:     {MASK}")
    print(f"Gateway:  {GATEWAY}")
    print(f"Key Type: {KEY_TYPE} (WPA2_AES_PSK)")
    print()

    print("Looking for printer...")
    dev = find_printer()
    if not dev:
        print("ERROR: No Xprinter found on USB!")
        print("Check: Is the USB cable plugged in? Is it a data cable (not charge-only)?")
        sys.exit(1)

    print(f"Found: VID=0x{dev.idVendor:04X} PID=0x{dev.idProduct:04X}")
    try:
        print(f"  Product: {usb.util.get_string(dev, dev.iProduct)}")
        print(f"  Serial:  {usb.util.get_string(dev, dev.iSerialNumber)}")
    except (usb.core.USBError, ValueError):
        pass

    # Detach kernel driver if needed (macOS sometimes claims the device)
    if dev.is_kernel_driver_active(0):
        print("Detaching kernel driver...")
        dev.detach_kernel_driver(0)

    # Set configuration
    dev.set_configuration()

    # Find the OUT endpoint (bulk transfer to printer)
    cfg = dev.get_active_configuration()
    intf = cfg[(0, 0)]
    ep_out = usb.util.find_descriptor(
        intf,
        custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
    )

    if not ep_out:
        print("ERROR: Could not find USB OUT endpoint!")
        sys.exit(1)

    print(f"  Endpoint: 0x{ep_out.bEndpointAddress:02X}")
    print()

    # Build and send the command
    cmd = build_wifi_command(IP, MASK, GATEWAY, SSID, PASSWORD, KEY_TYPE)
    print(f"Sending {len(cmd)} bytes...")
    print(f"  Hex: {cmd.hex()}")

    bytes_written = ep_out.write(cmd)
    print(f"  Wrote {bytes_written} bytes")
    print()
    print("DONE! Power cycle the printer to apply.")
    print(f"It should connect to '{SSID}' at {IP}.")


if __name__ == '__main__':
    main()
