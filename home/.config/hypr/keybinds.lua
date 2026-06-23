local global = _G.HYPR_VARS

local function m(key)
	return global.modifier .. " + " .. key
end

local function bind(key, dsp, opts)
	hl.bind(key, dsp, opts)
end

local drun = hl.dsp.exec_cmd("rofi -show drun -show-icons")

bind(m("period"), hl.dsp.layout("move +col"))
bind(m("comma"), hl.dsp.layout("move -col"))

bind(m("T"), hl.dsp.exec_cmd(global.terminal))
bind(m("C"), hl.dsp.exec_cmd("google-chrome"))
bind(m("E"), hl.dsp.exec_cmd(global.fileManager .. " ~/git"))
bind(m("D"), hl.dsp.exec_cmd("code ~/dotfiles/"))
bind(m("F"), hl.dsp.window.float({ action = "toggle" }))
bind(m("N"), hl.dsp.exec_cmd("swaync-client -t"))

bind(m("SPACE"), hl.dsp.global("GRun:grun_toggle"))
bind(m("G"), drun, { description = "app launcher" })
bind(m("SHIFT + S"), hl.dsp.exec_cmd("bash " .. global.hyprDir .. "/scripts/area-screenshot.sh"))

bind(m("R"), hl.dsp.exec_cmd(global.hyprDir .. "/scripts/restart-hyprland.fish"))
bind(m("W"), hl.dsp.window.close())
bind(m("L"), hl.dsp.exec_cmd("bash " .. global.hyprDir .. "/scripts/toggle-audio.sh"))

hl.bind("ALT + F4", hl.dsp.window.close())
bind(m("F4"), hl.dsp.exec_cmd("hyprctl kill"))

bind(m("P"), hl.dsp.exec_cmd("hyprpicker -a"))
bind(m("H"), hl.dsp.window.fullscreen({ action = "toggle" }))
bind(m("Return"), hl.dsp.window.fullscreen({ action = "toggle" }))

hl.bind("ALT + TAB", hl.dsp.group.next(), { description = "Change Group Forward" })
hl.bind(
	"ALT + SHIFT + TAB",
	hl.dsp.group.prev(),
	{ description = "Change Group Forward" }
)

bind(m("left"), hl.dsp.focus({ direction = "left" }))
bind(m("right"), hl.dsp.focus({ direction = "right" }))
bind(m("up"), hl.dsp.focus({ direction = "up" }))
bind(m("down"), hl.dsp.focus({ direction = "down" }))

bind(m("SHIFT + left"), hl.dsp.window.move({ direction = "left", group_aware = true }))
bind(m("SHIFT + right"), hl.dsp.window.move({ direction = "right", group_aware = true }))
bind(m("SHIFT + up"), hl.dsp.window.move({ direction = "up", group_aware = true }))
bind(m("SHIFT + down"), hl.dsp.window.move({ direction = "down", group_aware = true }))

for i = 1, 9 do
	bind(m(i), hl.dsp.focus({ workspace = i }))
	bind(m("SHIFT + " .. i), hl.dsp.window.move({ workspace = i }))
end

bind(m("0"), hl.dsp.focus({ workspace = 10 }))
bind(m("SHIFT + 0"), hl.dsp.window.move({ workspace = 10 }))

bind(m("SHIFT + G"), hl.dsp.group.toggle(), { description = "toggle group" })

bind(m("ALT + P"), hl.dsp.layout("promote"), { description = "scrolling: own column" })

bind(m("mouse_down"), hl.dsp.layout("move +col"))
bind(m("mouse_up"), hl.dsp.layout("move -col"))

bind(m("mouse:272"), hl.dsp.window.drag(), { mouse = true })
bind(m("mouse:273"), hl.dsp.window.resize(), { mouse = true })

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
