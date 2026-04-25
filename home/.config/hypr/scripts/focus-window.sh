#!/bin/sh

# Usage: ./focus_window.sh <address> <button_id>
# Dependency: jq (sudo pacman -S jq)

addr=$1
button=$2

notify-send "$1 $2"

# Validate input
if [ -z "$addr" ]; then
    echo "Error: No address provided"
    exit 1
fi

if [ "$button" -eq 1 ]; then
    # --- Left Click: Focus Window (Smart Group Handling) ---
    
    # 1. Disable cursor warping temporarily (so mouse stays on Waybar)
    hyprctl keyword cursor:no_warps true > /dev/null

    # 2. Attempt to focus the window directly
    hyprctl dispatch focuswindow address:"$addr" > /dev/null

    # 3. Check if the window is actually focused
    #    We check the hex address of the currently active window.
    current_addr=$(hyprctl activewindow -j | jq -r '.address')

    # Normalize addresses (ensure both are 0x...) for comparison
    # Sometimes Hyprland returns decimal, but usually 0x hex strings in JSON.
    # We assume string comparison works if format matches.
    
    if [ "$current_addr" != "$addr" ]; then
        # The window is not focused. It is likely hidden inside a group.
        # We assume the focuswindow command at least brought us to the correct Workspace and Group.
        
        # 4. Cycle through the group to find the window
        #    We limit to 10 iterations to prevent infinite loops if something is wrong.
        for i in $(seq 1 10); do
            # Switch to next tab
            hyprctl dispatch changegroupactive f > /dev/null
            
            # Check again
            new_addr=$(hyprctl activewindow -j | jq -r '.address')
            if [ "$new_addr" = "$addr" ]; then
                break
            fi
            
            # Optimization: If we wrapped around to the original wrong window, stop.
            if [ "$new_addr" = "$current_addr" ] && [ "$i" -gt 1 ]; then
                break
            fi
        done
    fi

    # 5. Re-enable cursor warping (restore default behavior)
    hyprctl keyword cursor:no_warps false > /dev/null

elif [ "$button" -eq 2 ]; then
    # --- Middle Click: Close Window ---
    hyprctl dispatch closewindow address:"$addr"
fi