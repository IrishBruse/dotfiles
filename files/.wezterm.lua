local wezterm = require 'wezterm'
local act = wezterm.action

local config = wezterm.config_builder()

config.default_prog = { 'nu' }
config.automatically_reload_config = true

config.font_size = 10.0
config.freetype_load_target = "HorizontalLcd"

config.hide_tab_bar_if_only_one_tab = true
config.window_background_opacity = 1
config.enable_scroll_bar = true
config.anti_alias_custom_block_glyphs = true

config.default_cursor_style = 'BlinkingBar'
config.animation_fps = 1
config.cursor_blink_ease_in = 'Constant'
config.cursor_blink_ease_out = 'Constant'

config.default_cwd = "A:\\"
config.disable_default_key_bindings = true

config.colors = {
    -- The default text color
    foreground = '#D4D4D4',
    -- The default background color
    background = '#191D1F',

    -- Overrides the cell background color when the current cell is occupied by the
    -- cursor and the cursor style is set to Block
    cursor_bg = '#ffffff',
    -- Overrides the text color when the current cell is occupied by the cursor
    cursor_fg = '#000000',
    -- Specifies the border color of the cursor when the cursor style is set to Block,
    -- or the color of the vertical or horizontal bar when the cursor style is set to
    -- Bar or Underline.
    cursor_border = '#52ad70',

    -- the foreground color of selected text
    selection_fg = '#D4D4D4',
    -- the background color of selected text
    selection_bg = '#354A1D',

    -- The color of the scrollbar "thumb"; the portion that represents the current viewport
    scrollbar_thumb = '#4f5051',

    -- The color of the split lines between panes
    split = '#32383d',

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

    -- Arbitrary colors of the palette in the range from 16 to 255
    indexed = { [136] = '#af8700' },

    -- Since: 20220319-142410-0fcdea07
    -- When the IME, a dead key or a leader key are being processed and are effectively
    -- holding input pending the result of input composition, change the cursor
    -- to this color to give a visual cue about the compose state.
    compose_cursor = 'orange',

    -- Colors for copy_mode and quick_select
    -- available since: 20220807-113146-c2fee766
    -- In copy_mode, the color of the active text is:
    -- 1. copy_mode_active_highlight_* if additional text was selected using the mouse
    -- 2. selection_* otherwise
    copy_mode_active_highlight_bg = { Color = '#000000' },
    -- use `AnsiColor` to specify one of the ansi color palette values
    -- (index 0-15) using one of the names "Black", "Maroon", "Green",
    --  "Olive", "Navy", "Purple", "Teal", "Silver", "Grey", "Red", "Lime",
    -- "Yellow", "Blue", "Fuchsia", "Aqua" or "White".
    copy_mode_active_highlight_fg = { AnsiColor = 'Black' },
    copy_mode_inactive_highlight_bg = { Color = '#52ad70' },
    copy_mode_inactive_highlight_fg = { AnsiColor = 'White' },

    quick_select_label_bg = { Color = 'peru' },
    quick_select_label_fg = { Color = '#ffffff' },
    quick_select_match_bg = { AnsiColor = 'Navy' },
    quick_select_match_fg = { Color = '#ffffff' },
}

config.font = wezterm.font {
    family = 'Cascadia Mono',
    harfbuzz_features = { 'ss01=0', 'ss02=0', 'ss03=0', 'ss04=0', 'ss05=0', 'ss06=0', 'zero=0', 'onum=0' },
}

config.keys = {
    {
        key = "C",
        mods = "CTRL",
        action = wezterm.action.DisableDefaultAssignment,
    },
    {
        key = "q",
        mods = "CTRL",
        action = wezterm.action.DisableDefaultAssignment,
    },
    {
        key = 'V',
        mods = 'CTRL',
        action = wezterm.action.DisableDefaultAssignment,
    },
    {
        key = "c",
        mods = "CTRL",
        action = wezterm.action_callback(function(window, pane)
            print(window:get_selection_text_for_pane(pane))
            if window:get_selection_text_for_pane(pane) == "" then
                window:perform_action(wezterm.action.SendKey { key = 'c', mods = 'CTRL' }, pane)
            else
                window:perform_action(wezterm.action { CopyTo = 'ClipboardAndPrimarySelection' }, pane)
            end
        end)

    },
    {
        key = "v",
        mods = "CTRL",
        action = wezterm.action.PasteFrom 'Clipboard'
    },
    {
        key = "|",
        mods = "CTRL",
        action = wezterm.action.SplitVertical { domain = "CurrentPaneDomain" }
    },
    {
        key = "k",
        mods = "CTRL",
        action = wezterm.action.Multiple {
            act.SendKey { key = 'c' },
            act.SendKey { key = 'l' },
            act.SendKey { key = 's' },
            act.SendKey { key = 'Enter' },
            wezterm.action.ClearScrollback "ScrollbackOnly",
        },
    },
    {
        key = 'p',
        mods = 'CTRL',
        action = wezterm.action.ActivateCommandPalette,
    },
}

return config
