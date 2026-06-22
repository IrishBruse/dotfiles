-- Mirrors keybinds.conf ($mod, binds).
-- Uses HYPR_VARS from hyprland.lua (same role as $terminal / $fileManager / $mod).

local v = assert(
	_G.HYPR_VARS,
	"hyprland.lua must set _G.HYPR_VARS before require('keybinds')"
)
local mod = v.mod
local drun = hl.dsp.exec_cmd("rofi -show drun -show-icons")
local toggle_grun = hl.dsp.exec_cmd("grun")

hl.bind(mod .. " + T", hl.dsp.exec_cmd(v.terminal))
hl.bind(mod .. " + C", hl.dsp.exec_cmd("google-chrome"))
hl.bind(mod .. " + E", hl.dsp.exec_cmd(v.fileManager .. " ~/git"))
hl.bind(mod .. " + D", hl.dsp.exec_cmd("code ~/dotfiles/"))
hl.bind(mod .. " + F", hl.dsp.window.float({ action = "toggle" }))
hl.bind(mod .. " + N", hl.dsp.exec_cmd("swaync-client -t"))

-- hl.bind(mod .. " + SPACE", toggle_grun, { description = "toggle GRun" })
hl.bind(mod .. " + G", drun, { description = "app launcher" })
hl.bind(
	mod .. " + SHIFT + S",
	hl.dsp.exec_cmd("bash " .. v.hyprDir .. "/scripts/area-screenshot.sh")
)

hl.bind(
	mod .. " + R",
	hl.dsp.exec_cmd(v.hyprDir .. "/scripts/restart-hyprland.fish")
)
hl.bind(mod .. " + W", hl.dsp.window.close())
hl.bind(mod .. " + L", hl.dsp.exec_cmd("bash " .. v.hyprDir .. "/scripts/toggle-audio.sh"))

hl.bind("ALT + F4", hl.dsp.window.close())
hl.bind(mod .. " + F4", hl.dsp.exec_cmd("hyprctl kill"))

hl.bind(mod .. " + P", hl.dsp.exec_cmd("hyprpicker -a"))
hl.bind(mod .. " + H", hl.dsp.window.fullscreen({ action = "toggle" }))
hl.bind(mod .. " + Return", hl.dsp.window.fullscreen({ action = "toggle" }))

hl.bind("ALT + TAB", hl.dsp.group.next(), { description = "Change Group Forward" })
hl.bind(
	"ALT + SHIFT + TAB",
	hl.dsp.group.prev(),
	{ description = "Change Group Forward" }
)

hl.bind(mod .. " + left", hl.dsp.focus({ direction = "left" }))
hl.bind(mod .. " + right", hl.dsp.focus({ direction = "right" }))
hl.bind(mod .. " + up", hl.dsp.focus({ direction = "up" }))
hl.bind(mod .. " + down", hl.dsp.focus({ direction = "down" }))

hl.bind(mod .. " + SHIFT + left", hl.dsp.window.move({ direction = "left", group_aware = true }))
hl.bind(mod .. " + SHIFT + right", hl.dsp.window.move({ direction = "right", group_aware = true }))
hl.bind(mod .. " + SHIFT + up", hl.dsp.window.move({ direction = "up", group_aware = true }))
hl.bind(mod .. " + SHIFT + down", hl.dsp.window.move({ direction = "down", group_aware = true }))

for i = 1, 9 do
	hl.bind(mod .. " + " .. i, hl.dsp.focus({ workspace = i }))
	hl.bind(mod .. " + SHIFT + " .. i, hl.dsp.window.move({ workspace = i }))
end
hl.bind(mod .. " + 0", hl.dsp.focus({ workspace = 10 }))
hl.bind(mod .. " + SHIFT + 0", hl.dsp.window.move({ workspace = 10 }))

hl.bind(mod .. " + SHIFT + G", hl.dsp.group.toggle(), { description = "toggle group" })

hl.bind(
	mod .. " + ALT + P",
	hl.dsp.layout("promote"),
	{ description = "scrolling: own column" }
)

hl.bind(mod .. " + mouse_down", hl.dsp.layout("move +col"))
hl.bind(mod .. " + mouse_up", hl.dsp.layout("move -col"))

hl.bind(mod .. " + mouse:272", hl.dsp.window.drag(), { mouse = true })
hl.bind(mod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

hl.bind(
	"XF86AudioRaiseVolume",
	hl.dsp.exec_cmd("wpctl set-volume -l 1 @DEFAULT_AUDIO_SINK@ 5%+"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86AudioLowerVolume",
	hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86AudioMute",
	hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86AudioMicMute",
	hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86MonBrightnessUp",
	hl.dsp.exec_cmd("brightnessctl -e4 -n2 set 5%+"),
	{ locked = true, repeating = true }
)
hl.bind(
	"XF86MonBrightnessDown",
	hl.dsp.exec_cmd("brightnessctl -e4 -n2 set 5%-"),
	{ locked = true, repeating = true }
)

hl.bind("XF86AudioNext", hl.dsp.exec_cmd("playerctl next"), { locked = true })
hl.bind("XF86AudioPause", hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioPlay", hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioPrev", hl.dsp.exec_cmd("playerctl previous"), { locked = true })
