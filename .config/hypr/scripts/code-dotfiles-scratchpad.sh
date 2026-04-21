#!/usr/bin/env bash
# Toggle ~/dotfiles VS Code window in special workspace

set -eu

# 1. Check if the special workspace is currently visible on the focused monitor
# We look for the "specialWorkspace" field in the monitor list
IS_SPECIAL_VISIBLE=$(hyprctl monitors -j | jq -r '.[] | select(.focused == true).specialWorkspace.name')

# 2. Logic: If it's visible (not empty or "null"), hide it.
# Otherwise, open/move to it.
if [ "$IS_SPECIAL_VISIBLE" != "" ] && [ "$IS_SPECIAL_VISIBLE" != "null" ]; then
    # Hides the special workspace
    hyprctl dispatch togglespecialworkspace special
else
    # Show the special workspace
    hyprctl dispatch togglespecialworkspace special

    # Only run code if it's not already visible to avoid duplicate instances/forks
    code "$HOME/dotfiles"

    sleep 1

    hyprctl dispatch movetoworkspacesilent special,title:^DOTFILES\$
fi