#!/usr/bin/fish

set tv "alsa_output.pci-0000_01_00.1.hdmi-stereo"
set headset "alsa_output.usb-Logitech_G533_Gaming_Headset-00.analog-stereo"

if test (pactl get-default-sink) = $tv
    pactl set-default-sink $headset
else
    pactl set-default-sink $tv
end
