#!/usr/bin/env fish

# Reload Hyprland
if ! hyprctl reload
    hyprctl notify 2 2000 0 "Failed to reload Hyprland"
    exit 1
end

# Kill existing waybar instances
killall waybar 2>/dev/null

# Reload swaync
swaync-client -R -rs

# Start waybar and capture error output
waybar &
waybar -c /home/econn/dotfiles/.config/waybar/titlebar.jsonc &

hyprctl notify 2 2000 0 "Hyprland Restarted"
