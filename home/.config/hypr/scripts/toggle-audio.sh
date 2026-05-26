#!/bin/bash

mapfile -t sinks < <(pactl list short sinks | cut -f2)
current=$(pactl get-default-sink)

next="${sinks[0]}"
for i in "${!sinks[@]}"; do
    if [[ "${sinks[$i]}" == "$current" ]]; then
        next="${sinks[$(( (i + 1) % ${#sinks[@]} ))]}"
        break
    fi
done

pactl set-default-sink "$next"

while read -r id _; do
    pactl move-sink-input "$id" "$next"
done < <(pactl list sink-inputs short)

desc=$(pactl list sinks | awk -v sink="$next" '
    $1 == "Name:" && $2 == sink { found=1 }
    found && $1 == "Description:" { print substr($0, index($0, $2)); exit }
')
notify-send -a waybar -i audio-card "Audio output" "${desc:-$next}" 2>/dev/null || true
