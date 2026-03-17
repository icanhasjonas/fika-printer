#!/usr/bin/env ruby
# Xprinter WiFi configurator - macOS version
# Based on: https://github.com/dantecatalfamo/xprinter-wifi
#
# Usage: ruby /tmp/xprinter-wifi-config.rb <device>
# Find device with: ls /dev/cu.usbmodem* /dev/cu.usbserial* 2>/dev/null
# Or check: system_profiler SPUSBDataType | grep -A5 -i printer

require 'ipaddr'

PREAMBLE = "\x1f\x1b\x1f"
NETWORK_CMD = "\xb4"

device = ARGV[0]
unless device
  puts "Looking for USB printer devices..."
  devs = Dir.glob('/dev/cu.usb*') + Dir.glob('/dev/cu.wchusbserial*')
  if devs.empty?
    # Also check for /dev/usb/lp* style (unlikely on macOS)
    devs = Dir.glob('/dev/usb/lp*')
  end
  if devs.empty?
    abort "No USB devices found. Plug in the printer and try again.\nManually specify: ruby #{$0} /dev/cu.usbXXXX"
  end
  puts "Found: #{devs.join(', ')}"
  device = devs.first
  puts "Using: #{device}"
end

abort "Device #{device} does not exist" unless File.exist?(device)

# FIKA WiFi config - edit these values
ip      = "192.168.1.100"
mask    = "255.255.255.0"
gateway = "192.168.1.1"
ssid    = "CHANGEME"        # <-- Set your WiFi SSID
key     = "CHANGEME"        # <-- Set your WiFi password
key_type = 6                # WPA2_AES_PSK

puts "=== Xprinter WiFi Configuration ==="
puts "Device:   #{device}"
puts "IP:       #{ip}"
puts "Mask:     #{mask}"
puts "Gateway:  #{gateway}"
puts "SSID:     #{ssid}"
puts "Key Type: #{key_type} (WPA2_AES_PSK)"
puts ""

if ssid == "CHANGEME" || key == "CHANGEME"
  abort "ERROR: Edit this script and set the SSID and password first!"
end

puts "Sending WiFi config..."

ip_bin = IPAddr.new(ip).hton.force_encoding('UTF-8')
mask_bin = IPAddr.new(mask).hton.force_encoding('UTF-8')
gw_bin = IPAddr.new(gateway).hton.force_encoding('UTF-8')

cmd = "#{PREAMBLE}#{NETWORK_CMD}#{ip_bin}#{mask_bin}#{gw_bin}#{key_type.chr}#{ssid}\0#{key}\0"

File.open(device, 'wb') do |f|
  f.write(cmd)
  f.flush
end

puts "Sent! Power cycle the printer to apply."
puts "It should connect to '#{ssid}' and be reachable at #{ip}."
