#!/usr/bin/env bash
# Open ~/dotfiles in VS Code (Electron) and move that window to special:special.
# Window rules cannot do this alone: Code forks, and the folder name appears in the title only after load.

set -eu

code "$HOME/dotfiles" &

(
	deadline=$((SECONDS + 90))
	while ((SECONDS < deadline)); do
		addr="$(python3 -c '
import json, subprocess
try:
    raw = subprocess.check_output(["hyprctl", "clients", "-j"], text=True)
    for c in json.loads(raw):
        if (c.get("class") or "").lower() != "code":
            continue
        title = (c.get("title") or "").lower()
        if "dotfiles" in title:
            print(c["address"])
            break
except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError):
    pass
' 2>/dev/null || true)"
		if [[ -n "$addr" ]]; then
			hyprctl dispatch movetoworkspacesilent "special:special,address:${addr}"
			exit 0
		fi
		sleep 0.2
	done
) &
