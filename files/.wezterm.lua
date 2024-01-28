---@type wezterm
local wezterm = require "wezterm"
local mux = wezterm.mux
local config = wezterm.config_builder()

config.default_prog = { "nu" }
config.default_gui_startup_args = { "start" }

config.font_size = 10.0
config.freetype_load_target = "HorizontalLcd"

config.initial_cols = 120
config.initial_rows = 30

config.hide_tab_bar_if_only_one_tab = true
config.window_background_opacity = .9
config.enable_scroll_bar = true
config.anti_alias_custom_block_glyphs = true
config.window_close_confirmation = "NeverPrompt"
config.window_decorations = "RESIZE"
config.enable_scroll_bar = false
config.default_cursor_style = "BlinkingBar"
config.animation_fps = 30
config.cursor_blink_ease_in = "Constant"
config.cursor_blink_ease_out = "Constant"
config.automatically_reload_config = true
config.default_cwd = "A:/"

wezterm.on("gui-startup", function(cmd)
    local config = cmd or {}
    local screens = wezterm.gui.screens()
    local active = screens["active"]
    local tab, pane, window = mux.spawn_window(config)
    local gui_window = window:gui_window()
    local term_size = gui_window:get_dimensions()
    gui_window:set_position(active.width / 2 - term_size.pixel_width / 2, active.height / 2 - term_size.pixel_height / 2)
end)

local font = wezterm.font_with_fallback {
    {
        family = "Cascadia Mono",
        weight = "Bold",
        italic = false,
    },
    {
        family = "Symbols Nerd Font Mono",
    },
}

config.font = font

config.window_frame = {
    font = font,
    active_titlebar_bg = "#23272a",
    inactive_titlebar_bg = "#333333",
}

config.colors = {
    foreground = "#D4D4D4",
    background = "#191D1F",

    cursor_bg = "#D4D4D4",
    cursor_fg = "#D4D4D4",
    cursor_border = "#D4D4D4",

    selection_fg = "#D4D4D4",
    selection_bg = "#354A1D",

    scrollbar_thumb = "#4f5051",

    split = "#32383d",

    tab_bar = {
        background = "#23272a",
        active_tab = {
            bg_color = "#191D1F",
            fg_color = "#D4D4D4",
        },
        inactive_tab = {
            bg_color = "#1e2224",
            fg_color = "#D4D4D4",
        },
        inactive_tab_hover = {
            bg_color = "#191D1F",
            fg_color = "#D4D4D4",
        },
        new_tab = {
            bg_color = "#23272a",
            fg_color = "#D4D4D4",
        },
        new_tab_hover = {
            bg_color = "#191D1F",
            fg_color = "#D4D4D4",
        },
    },

    ansi = {
        "#000000",
        "#e53935",
        "#91b859",
        "#ffb62c",
        "#6182b8",
        "#ff5370",
        "#39adb5",
        "#a0a0a0",
    },
    brights = {
        "#4e4e4e",
        "#ff5370",
        "#c3e88d",
        "#ffcb6b",
        "#82aaff",
        "#f07178",
        "#89ddff",
        "#ffffff",
    },

    indexed = { [136] = "#af8700" },
    compose_cursor = "orange",

    copy_mode_active_highlight_bg = { Color = "#000000" },
    copy_mode_active_highlight_fg = { AnsiColor = "Black" },
    copy_mode_inactive_highlight_bg = { Color = "#52ad70" },
    copy_mode_inactive_highlight_fg = { AnsiColor = "White" },

    quick_select_label_bg = { Color = "peru" },
    quick_select_label_fg = { Color = "#ffffff" },
    quick_select_match_bg = { AnsiColor = "Navy" },
    quick_select_match_fg = { Color = "#ffffff" },
}

config.disable_default_key_bindings = true
config.keys = {
    { mods = "CTRL|SHIFT", key = "p", action = wezterm.action.ActivateCommandPalette, },
    { mods = "CTRL",       key = "w", action = wezterm.action.CloseCurrentTab({ confirm = false }), },
    { mods = "CTRL",       key = "v", action = wezterm.action.PasteFrom("Clipboard"), },
    { mods = 'CTRL',       key = 'n', action = wezterm.action.SpawnCommandInNewTab {} },
    { mods = 'CTRL|SHIFT', key = 'r', action = wezterm.action.ReloadConfiguration },
    {
        key = "c",
        mods = "CTRL",
        action = wezterm.action_callback(function(window, pane)
            if window:get_selection_text_for_pane(pane) == "" then
                window:perform_action(wezterm.action.SendKey { key = "c", mods = "CTRL" }, pane)
            else
                window:perform_action(wezterm.action { CopyTo = "ClipboardAndPrimarySelection" }, pane)
            end
        end),
    },
    {
        mods = "CTRL",
        key = "a",
        action = wezterm.action.Multiple({
            wezterm.action.ActivateCopyMode
        }),
    },
}

return config
