#!/usr/bin/env bash
while true; do
    if hyprctl clients -j | jq -e ".[] | select(.$1 == \"$2\")" > /dev/null; then
        break
    fi
    sleep 0.5
done