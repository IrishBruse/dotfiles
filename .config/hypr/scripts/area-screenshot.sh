#!/usr/bin/env bash
# Area screenshot to clipboard.
# hyprpicker -rz freezes the composited frame so you can select over video/motion
# (-r: render/freeze inactive path, -z: no zoom lens). Layerrule "selection" + sleep
# after slurp avoids the slurp stroke ending up in the PNG.
set -euo pipefail

cleanup() {
	killall hyprpicker 2>/dev/null || true
}
trap cleanup EXIT

hyprpicker -rz &
sleep 0.2

if ! g=$(slurp); then
	exit 0
fi

sleep 0.2
grim -g "$g" - | wl-copy
