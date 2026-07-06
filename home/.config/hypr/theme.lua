-- Mirrors theme.conf (environment variables + GTK/gsettings on start).
-- GDK_BACKEND unset: let GTK pick (Cinnamon does not force wayland; helps Nemo/file-roller DnD).

hl.env("SDL_VIDEODRIVER", "wayland")
hl.env("CLUTTER_BACKEND", "wayland")
hl.env("XDG_CURRENT_DESKTOP", "Hyprland")
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("XDG_SESSION_DESKTOP", "Hyprland")

hl.env("QT_AUTO_SCREEN_SCALE_FACTOR", "1")
hl.env("QT_QPA_PLATFORM", "wayland;xcb")
hl.env("QT_WAYLAND_DISABLE_WINDOWDECORATION", "1")
hl.env("QT_QPA_PLATFORMTHEME", "qt6ct")

hl.env("XCURSOR_THEME", "CustomCursors")
hl.env("XCURSOR_SIZE", "22")

local M = {}

function M.on_start()
	hl.exec_cmd("gsettings set org.gnome.desktop.interface icon-theme 'Papirus-Dark'")
	hl.exec_cmd("gsettings set org.gnome.desktop.interface gtk-theme 'Mint-Y-Dark'")
	hl.exec_cmd("gsettings set org.gnome.desktop.interface cursor-theme 'CustomCursors'")
	hl.exec_cmd("gsettings set org.gnome.desktop.interface font-name 'Cascadia Code'")
end

return M
