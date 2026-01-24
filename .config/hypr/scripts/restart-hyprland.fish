#!/usr/bin/env fish

# Reload Hyprland
if ! hyprctl reload
    hyprctl notify 2 2000 0 "Failed to reload Hyprland"
    exit 1
end

# Kill existing waybar instance (ignore error if not running)
killall waybar 2>/dev/null

# Reload swaync
swaync-client -R -rs

# Start waybar and capture error output
set -l waybar_error (waybar 2>&1 &)
set -l waybar_pid $last_pid

# Give waybar a moment to initialize
sleep 0.5

# Check if waybar process is still running
if not kill -0 $waybar_pid 2>/dev/null
    # Process died, capture error message (only error lines, trimmed)
    set -l error_output (waybar 2>&1 | grep "\[error\]" | sed 's/.*\[error\] //')
    hyprctl notify 3 5000 0 "Waybar failed: $error_output"
    exit 1
end

hyprctl notify 2 2000 0 "Hyprland Restarted"
