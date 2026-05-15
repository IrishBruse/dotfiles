-- Mirrors hyprland.conf (main config + layout rules).
-- https://wiki.hypr.land/Configuring/Start/
--
-- Split like the old hyprlang files: startup.lua, theme.lua, keybinds.lua

_G.HYPR_VARS = {
	terminal = "ghostty",
	fileManager = "nemo",
	mod = "SUPER",
	-- $menu was never set in the .conf chain, last SUPER+R bind used $menu
	menu = "rofi -show drun -show-icons",
	hyprDir = "~/dotfiles/home/.config/hypr",
}

-----------------
---- MONITORS ---
-----------------

hl.monitor({
	output = "DP-1",
	mode = "2560x1440@165",
	position = "0x0",
	scale = 1.25,
	vrr = 3,
})

hl.monitor({
	output = "HDMI-A-3",
	mode = "1920x1080@60",
	position = "2048x0",
	scale = 1,
})

hl.config({
	xwayland = {
		force_zero_scaling = true,
		use_nearest_neighbor = true,
	},
})

-- Same order as hyprland.conf: source = startup, theme, keybinds
local theme_mod = require("theme")
local startup_mod = require("startup")

hl.on("hyprland.start", function()
	startup_mod.on_start()
	theme_mod.on_start()
end)

require("keybinds")

-----------------------
---- LOOK AND FEEL ----
-----------------------

hl.config({
	general = {
		gaps_in = 0,
		gaps_out = 0,
		border_size = 0,
		col = {
			active_border = "rgba(636d83ff)",
			inactive_border = "rgba(21252bff)",
		},
		resize_on_border = false,
		layout = "master",
	},

	decoration = {
		rounding = 3,
		rounding_power = 2,
		active_opacity = 1.0,
		inactive_opacity = 1.0,
		shadow = {
			enabled = true,
			range = 4,
			render_power = 3,
			color = "rgba(1a1a1aee)",
		},
		blur = {
			enabled = false,
			passes = 1,
			vibrancy = 0.1696,
		},
	},

	cursor = {
		no_warps = true,
	},

	animations = {
		enabled = true,
	},

	scrolling = {
		column_width = 0.75,
		follow_focus = false,
	},

	misc = {
		force_default_wallpaper = 0,
		background_color = "rgba(2C3037ff)",
		middle_click_paste = false,
	},

	group = {
		merge_groups_on_drag = false,
		col = {
			border_active = "rgba(35a854ff)",
			border_inactive = "rgba(21252bff)",
			border_locked_active = "rgba(e06c75ff)",
			border_locked_inactive = "rgba(5c6370ff)",
		},
		groupbar = {
			enabled = false,
		},
	},

	input = {
		kb_layout = "gb",
		kb_variant = "",
		kb_model = "",
		kb_options = "caps:none",
		kb_rules = "",
		follow_mouse = 2,
		accel_profile = "flat",
		sensitivity = 0.1,
		touchpad = {
			natural_scroll = false,
		},
	},
})

hl.curve("easeOutQuint", { type = "bezier", points = { { 0.23, 1 }, { 0.32, 1 } } })
hl.curve("easeInOutCubic", { type = "bezier", points = { { 0.65, 0.05 }, { 0.36, 1 } } })
hl.curve("linear", { type = "bezier", points = { { 0, 0 }, { 1, 1 } } })
hl.curve("almostLinear", { type = "bezier", points = { { 0.5, 0.5 }, { 0.75, 1 } } })
hl.curve("quick", { type = "bezier", points = { { 0.15, 0 }, { 0.1, 1 } } })

hl.animation({ leaf = "global", enabled = true, speed = 20, bezier = "default" })
hl.animation({ leaf = "border", enabled = true, speed = 5.39, bezier = "easeOutQuint" })
hl.animation({ leaf = "windows", enabled = true, speed = 4.79, bezier = "easeOutQuint" })
hl.animation({
	leaf = "windowsIn",
	enabled = true,
	speed = 4.1,
	bezier = "easeOutQuint",
	style = "popin 87%",
})
hl.animation({
	leaf = "windowsOut",
	enabled = true,
	speed = 1.49,
	bezier = "linear",
	style = "popin 87%",
})
hl.animation({ leaf = "fadeIn", enabled = true, speed = 1.73, bezier = "almostLinear" })
hl.animation({ leaf = "fadeOut", enabled = true, speed = 1.46, bezier = "almostLinear" })
hl.animation({ leaf = "fade", enabled = true, speed = 3.03, bezier = "quick" })
hl.animation({ leaf = "layers", enabled = true, speed = 3.81, bezier = "easeOutQuint" })
hl.animation({
	leaf = "layersIn",
	enabled = true,
	speed = 4,
	bezier = "easeOutQuint",
	style = "fade",
})
hl.animation({
	leaf = "layersOut",
	enabled = true,
	speed = 1.5,
	bezier = "linear",
	style = "fade",
})
hl.animation({ leaf = "fadeLayersIn", enabled = true, speed = 1.79, bezier = "almostLinear" })
hl.animation({ leaf = "fadeLayersOut", enabled = true, speed = 1.39, bezier = "almostLinear" })
hl.animation({
	leaf = "workspaces",
	enabled = true,
	speed = 1.94,
	bezier = "almostLinear",
	style = "fade",
})
hl.animation({
	leaf = "workspacesIn",
	enabled = true,
	speed = 1.21,
	bezier = "almostLinear",
	style = "fade",
})
hl.animation({
	leaf = "workspacesOut",
	enabled = true,
	speed = 1.94,
	bezier = "almostLinear",
	style = "fade",
})
hl.animation({ leaf = "zoomFactor", enabled = true, speed = 7, bezier = "quick" })

hl.workspace_rule({
	workspace = "r[1-10]",
	layout = "scrolling",
	layout_opts = { direction = "right" },
})

hl.workspace_rule({
	workspace = "special:special",
	gaps_in = 4,
	gaps_out = 20,
	border_size = 20,
})

local mod = _G.HYPR_VARS.mod
hl.bind(mod .. " + period", hl.dsp.layout("move +col"))
hl.bind(mod .. " + comma", hl.dsp.layout("move -col"))

hl.gesture({
	fingers = 3,
	direction = "horizontal",
	action = "workspace",
})

hl.layer_rule({
	name = "slurp-selection-no-anim",
	match = { namespace = "selection" },
	no_anim = true,
})

hl.window_rule({
	name = "all",
	match = { class = ".*" },
	suppress_event = "maximize",
	decorate = true,
})

hl.window_rule({
	name = "fix-xwayland-drags",
	match = {
		class = "^$",
		title = "^$",
		xwayland = true,
		float = true,
		fullscreen = false,
		pin = false,
	},
	no_focus = true,
})

hl.window_rule({
	name = "polkit",
	match = { class = "org.kde.polkit-kde-authentication-agent-1" },
	center = true,
	float = true,
})

hl.window_rule({
	name = "floating",
	match = { float = true },
	persistent_size = true,
	no_max_size = true,
})

hl.window_rule({
	name = "godot",
	match = { class = "org.godotengine.ProjectManager" },
	float = true,
	center = true,
	size = { 1000, 625 },
})

hl.window_rule({
	name = "godot",
	match = { class = "Godot" },
	float = false,
	group = "set",
})

hl.window_rule({
	name = "sameboy",
	match = { class = "sameboy" },
	workspace = "2 silent",
	monitor = "1",
	focus_on_activate = true,
})

hl.window_rule({
	name = "nemo",
	match = { class = "nemo" },
	float = true,
	center = true,
	border_size = 4,
	size = { 900, 800 },
})

hl.window_rule({
	name = "power",
	match = { initial_title = "Power Menu" },
	float = true,
	center = true,
	border_size = 0,
	size = { 100, 44 },
	max_size = { 150, 44 },
	pin = true,
	focus_on_activate = true,
	no_blur = true,
	stay_focused = true,
})

hl.window_rule({
	name = "special_workspace_indicator",
	match = { workspace = "special:special" },
	border_color = "rgba(3D414Cff)",
	border_size = 4,
})

hl.window_rule({
	match = { class = "nm-connection-editor" },
	float = true,
	center = true,
})

hl.window_rule({
	match = { class = "pavucontrol" },
	float = true,
	center = true,
})

hl.window_rule({
	match = { class = "xdg-desktop-portal-gtk" },
	float = true,
	center = true,
})

hl.window_rule({
	match = { class = "captain.py" },
	float = true,
})

hl.window_rule({
	match = { class = "captsain.py" },
	center = true,
})

hl.window_rule({
	match = { class = "mintUpdate.py" },
	float = true,
	center = true,
})

hl.window_rule({
	match = { initial_title = "Open File" },
	float = true,
	center = true,
})

hl.window_rule({
	match = { initial_title = "Monoboy" },
	float = true,
})

hl.window_rule({
	match = { class = "discord" },
	workspace = "2",
})

hl.window_rule({
	match = { title = "^(Client \\(.*)" },
	monitor = "1",
})
