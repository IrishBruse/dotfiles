-- Mirrors startup.conf (autostart commands).

local M = {}

function M.on_start()
	hl.exec_cmd("dbus-update-activation-environment --systemd --all")
	hl.exec_cmd("bash ~/.config/hypr/scripts/bluetooth-start.sh")
	hl.exec_cmd("waybar")
	hl.exec_cmd("swaync")
	hl.exec_cmd("hyprctl setcursor CustomCursors 22")

	hl.exec_cmd(
		"flatpak run com.github.wwmm.easyeffects --service-mode --hide-window"
	)
	hl.exec_cmd("/usr/lib/x86_64-linux-gnu/libexec/polkit-kde-authentication-agent-1")
	hl.exec_cmd(
		"flatpak run com.discordapp.Discord --enable-features=WaylandWindowDecorations --ozone-platform-hint=auto --start-minimized"
	)
end

return M
