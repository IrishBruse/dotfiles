#!/bin/bash

HEADSET_SINK="alsa_output.usb-Logitech_G533_Gaming_Headset-00.iec958-stereo"
HDMI_SINK="alsa_output.pci-0000_04_00.0.hdmi-stereo-extra1"
JABRA_MAC="50:C2:75:22:31:3D"

find_bt_sink() {
    pactl list short sinks 2>/dev/null | awk '{print $2}' | grep '^bluez_output\.' | head -1
}

sink_exists() {
    pactl list short sinks 2>/dev/null | awk '{print $2}' | grep -Fxq "$1"
}

bluez_mac_from_sink() {
    local sink="$1"
    [[ "$sink" != bluez_output.* ]] && return 1
    local id="${sink#bluez_output.}"
    id="${id%.*}"
    echo "$id" | tr '_' ':'
}

# Connect Jabra and wait until PipeWire exposes a bluez sink. Prints sink name.
connect_bluetooth() {
    local sink="${1:-}"
    local mac

    if [[ -n "$sink" ]]; then
        mac=$(bluez_mac_from_sink "$sink") || mac="$JABRA_MAC"
    else
        mac="$JABRA_MAC"
    fi

    bluetoothctl connect "$mac" >/dev/null 2>&1 || true

    for _ in $(seq 1 30); do
        sink=$(find_bt_sink)
        if [[ -n "$sink" ]]; then
            echo "$sink"
            return 0
        fi
        sleep 0.1
    done
    return 1
}

# Headset -> Bluetooth -> HDMI
bt_sink=$(find_bt_sink)
cycle=("$HEADSET_SINK")
[[ -n "$bt_sink" ]] && cycle+=("$bt_sink")
cycle+=("$HDMI_SINK")

sinks=()
for s in "${cycle[@]}"; do
    sink_exists "$s" && sinks+=("$s")
done

[[ ${#sinks[@]} -eq 0 ]] && exit 0

current=$(pactl get-default-sink)
next="${sinks[0]}"

for i in "${!sinks[@]}"; do
    if [[ "${sinks[$i]}" == "$current" ]]; then
        next="${sinks[$(( (i + 1) % ${#sinks[@]} ))]}"
        break
    fi
done

# From headset, first right-click should switch to Bluetooth
if [[ "$current" == "$HEADSET_SINK" && "$next" != bluez_output.* ]]; then
    bt_sink=$(connect_bluetooth || true)
    [[ -n "$bt_sink" ]] && next="$bt_sink"
fi

if [[ "$next" == bluez_output.* ]]; then
    bt_sink=$(connect_bluetooth "$next" || true)
    [[ -n "$bt_sink" ]] && next="$bt_sink"
fi

pactl set-default-sink "$next"

while read -r id _; do
    pactl move-sink-input "$id" "$next"
done < <(pactl list sink-inputs short)

desc=$(pactl list sinks | awk -v sink="$next" '
    $1 == "Name:" && $2 == sink { found=1 }
    found && $1 == "Description:" { print substr($0, index($0, $2)); exit }
')
notify-send -a waybar -i audio-card "Audio output" "${desc:-$next}" 2>/dev/null || true
