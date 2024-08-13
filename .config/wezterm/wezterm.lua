---@type wezterm
local wezterm = require "wezterm"
local mux = wezterm.mux
local config = wezterm.config_builder()

config.default_gui_startup_args = { "start" }
config.freetype_load_target = "HorizontalLcd"

if wezterm.target_triple == 'aarch64-apple-darwin' then
    config.font_size = 12.0
    config.default_prog = { "/opt/homebrew/bin/fish", "-i", "-l" }
else
    config.font_size = 9.0
    config.default_prog = { "fish", "-i", "-l" }
end

config.initial_cols                   = 120
config.initial_rows                   = 30

config.hide_tab_bar_if_only_one_tab   = true
config.enable_scroll_bar              = true
config.anti_alias_custom_block_glyphs = true
config.window_close_confirmation      = "NeverPrompt"
config.window_decorations             = "RESIZE"
config.default_cursor_style           = "BlinkingBar"
config.animation_fps                  = 60
config.cursor_blink_ease_in           = "Constant"
config.cursor_blink_ease_out          = "Constant"
config.automatically_reload_config    = true
config.use_fancy_tab_bar              = true

config.window_padding                 = {
    left = 4,
    right = 10,
    top = 6,
    bottom = 6,
}

local ctrl                            = wezterm.target_triple == 'aarch64-apple-darwin' and "CMD" or "CTRL"

wezterm.on("gui-startup", function(cmd)
    local config = cmd or {}
    local screens = wezterm.gui.screens()
    local active = screens["active"]
    local tab, pane, window = mux.spawn_window(config)
    local gui_window = window:gui_window()
    local term_size = gui_window:get_dimensions()
    gui_window:set_position(active.width / 2 - term_size.pixel_width / 2, active.height / 2 - term_size.pixel_height / 2)
end)

config.font = wezterm.font_with_fallback {
    {
        family = "Cascadia Code",
        italic = false,
    },
    "Symbols Nerd Font Mono"
}

config.colors = {
    scrollbar_thumb = '#4e5666',
    tab_bar = {
        background = '#21252b',
        inactive_tab_edge = '#21252b',
        active_tab = {
            bg_color = '#282c34',
            fg_color = '#d7dae0',
        },
        inactive_tab = {
            bg_color = '#21252b',
            fg_color = '#9da5b4',
        }
    },
}

config.window_frame = {
    font = config.font,
    inactive_titlebar_bg = '#21252b',
    active_titlebar_bg = '#21252b',
    inactive_titlebar_fg = '#cccccc',
    active_titlebar_fg = '#ffffff',
}

config.color_scheme = 'OneDark (base16)'

local smartcopy = wezterm.action_callback(function(window, pane)
    if window:get_selection_text_for_pane(pane) == "" then
        window:perform_action(wezterm.action.SendKey { key = "c", mods = "CTRL" }, pane)
    else
        window:perform_action(wezterm.action { CopyTo = "ClipboardAndPrimarySelection" }, pane)
    end
end)

local selectAll = wezterm.action.Multiple({ wezterm.action.ActivateCopyMode })

config.disable_default_key_bindings = true
config.keys = {
    { mods = ctrl .. "|SHIFT", key = "p",          action = wezterm.action.ActivateCommandPalette, },
    { mods = ctrl,             key = "w",          action = wezterm.action.CloseCurrentTab({ confirm = false }), },
    { mods = ctrl,             key = "v",          action = wezterm.action.PasteFrom("Clipboard"), },
    { mods = ctrl,             key = "n",          action = wezterm.action.SpawnCommandInNewTab {} },
    { mods = ctrl,             key = "k",          action = wezterm.action.ClearScrollback("ScrollbackAndViewport") },
    { mods = ctrl,             key = "c",          action = smartcopy },
    { mods = ctrl,             key = "a",          action = selectAll },
    { mods = ctrl,             key = "Backspace",  action = wezterm.action.SendKey { mods = 'OPT', key = 'Backspace' }, },
    { mods = ctrl,             key = "Delete",     action = wezterm.action.SendKey { mods = 'CTRL', key = 'Delete' }, },
    { mods = ctrl,             key = "r",          action = wezterm.action.SendKey { mods = 'CTRL', key = 'r' }, },
    { mods = ctrl,             key = "LeftArrow",  action = wezterm.action.SendKey { mods = 'CTRL', key = 'LeftArrow' }, },
    { mods = ctrl,             key = "RightArrow", action = wezterm.action.SendKey { mods = 'CTRL', key = 'RightArrow' }, },
}

return config
