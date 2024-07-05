---@type wezterm
local wezterm = require "wezterm"
local mux = wezterm.mux
local config = wezterm.config_builder()

config.default_prog = { "zsh", "-i", "-l" }
config.default_gui_startup_args = { "start" }

if wezterm.target_triple == 'aarch64-apple-darwin' then
    config.font_size = 12.0
else
    config.font_size = 9.0
end
config.freetype_load_target = "HorizontalLcd"

config.initial_cols = 120
config.initial_rows = 30

config.hide_tab_bar_if_only_one_tab = true
config.enable_scroll_bar = true
config.anti_alias_custom_block_glyphs = true
config.window_close_confirmation = "NeverPrompt"
config.window_decorations = "RESIZE"
config.enable_scroll_bar = false
config.default_cursor_style = "BlinkingBar"
config.animation_fps = 60
config.cursor_blink_ease_in = "Constant"
config.cursor_blink_ease_out = "Constant"
config.automatically_reload_config = true

local ctrl = "CTRL"

if wezterm.target_triple == 'aarch64-apple-darwin' then
    ctrl = "CMD"
end

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
        family = "CaskaydiaMono NFM",
        italic = false,
    },
}

config.window_frame = {
    font = font,
    active_titlebar_bg = "#23272a",
    inactive_titlebar_bg = "#333333",
}

config.color_scheme = 'OneHalfDark'

config.disable_default_key_bindings = true
config.keys = {
    { mods = ctrl .. "|SHIFT", key = "p", action = wezterm.action.ActivateCommandPalette, },
    { mods = ctrl,             key = "w", action = wezterm.action.CloseCurrentTab({ confirm = false }), },
    { mods = ctrl,             key = "v", action = wezterm.action.PasteFrom("Clipboard"), },
    { mods = ctrl,             key = "n", action = wezterm.action.SpawnCommandInNewTab {} },
    { mods = ctrl,             key = "k", action = wezterm.action.ClearScrollback("ScrollbackAndViewport") },
    { mods = ctrl .. "|SHIFT", key = "r", action = wezterm.action.ReloadConfiguration },
    {
        mods = ctrl .. "",
        key = "c",
        action = wezterm.action_callback(function(window, pane)
            if window:get_selection_text_for_pane(pane) == "" then
                window:perform_action(wezterm.action.SendKey { key = "c", mods = ctrl }, pane)
            else
                window:perform_action(wezterm.action { CopyTo = "ClipboardAndPrimarySelection" }, pane)
            end
        end),
    },
    {
        mods = ctrl,
        key = "a",
        action = wezterm.action.Multiple({
            wezterm.action.ActivateCopyMode
        }),
    },
}

return config