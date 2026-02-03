#!/bin/bash

HDMI_SINK="alsa_output.pci-0000_04_00.0.hdmi-stereo-extra1"
HEADSET_SINK="alsa_output.usb-Logitech_G533_Gaming_Headset-00.iec958-stereo"

CURRENT_SINK=$(pactl get-default-sink)

if [ "$CURRENT_SINK" = "$HDMI_SINK" ]; then
    NEW_SINK="$HEADSET_SINK"
else
    NEW_SINK="$HDMI_SINK"
fi

pactl set-default-sink "$NEW_SINK"

for INPUT in $(pactl list sink-inputs short | cut -f1); do
    pactl move-sink-input "$INPUT" "$NEW_SINK"
done