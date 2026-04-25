yad --title="Power Menu" --window-icon="system-shutdown" \
    --button=" Shutdown!system-shutdown:systemctl poweroff" \
    --button=" Restart!system-reboot:systemctl reboot" \
    --button=" Suspend!system-suspend:systemctl suspend" \
    --button=" Log Out!system-log-out:gnome-session-quit --logout --no-prompt" \
    --buttons-layout=center