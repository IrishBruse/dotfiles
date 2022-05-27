"use strict";
// Future versions of Hyper may add additional config options,
// which will not automatically be merged into this file.
// See https://hyper.is#cfg for all currently supported options.
module.exports = {
    config: {
        // choose either `"stable"` for receiving highly polished,
        // or `"canary"` for less polished but more frequent updates
        updateChannel: "stable",
        // default font size in pixels for all tabs
        fontSize: 14,
        // font family with optional fallbacks
        fontFamily: "'Cascadia Code'",
        // default font weight: "normal" or "bold"
        fontWeight: "normal",
        // font weight for bold characters: "normal" or "bold"
        fontWeightBold: "bold",
        // line height as a relative unit
        lineHeight: 1,
        // letter spacing as a relative unit
        letterSpacing: 0,
        // terminal cursor background color and opacity (hex, rgb, hsl, hsv, hwb or cmyk)
        cursorColor: "#86c332",
        // terminal text color under BLOCK cursor
        cursorAccentColor: "#000",
        // `"BEAM"` for |, `"UNDERLINE"` for _, `"BLOCK"` for █
        cursorShape: "BEAM",
        // set to `true` (without backticks and without quotes) for blinking cursor
        cursorBlink: true,
        // color of the text
        foregroundColor: "#BBBBBB",
        // terminal background color
        // opacity is only supported on macOS
        backgroundColor: "#191d1f",
        // terminal selection color
        selectionColor: "#86c332",
        // border color (window, tabs)
        borderColor: "#5C5A58",
        // custom CSS to embed in the main window
        css: `
        .header_closeWindow:hover {
            background-color: #E81123;
        }

        .header_windowHeader {
            background-color: #4C4A48;
        }

        .header_windowControls > div:nth-child(1):hover,
        .header_windowControls > div:nth-child(2):hover{
            background-color: #78726C;
        }
        `,
        padding: "0",
        // custom CSS to embed in the terminal window
        termCSS: "",
        // set custom startup directory (must be an absolute path)
        workingDirectory: "Z://",
        // if you"re using a Linux setup which show native menus, set to false
        // default: `true` on Linux, `true` on Windows, ignored on macOS
        showHamburgerMenu: false,
        // set to `false` (without backticks and without quotes) if you want to hide the minimize, maximize and close buttons
        // additionally, set to `"left"` if you want them on the left, like in Ubuntu
        // default: `true` (without backticks and without quotes) on Windows and Linux, ignored on macOS
        showWindowControls: true,
        // the full list. if you"re going to provide the full color palette,
        // including the 6 x 6 color cubes and the grayscale map, just provide
        // an array here instead of a color map object
        colors: {
            black: "#000000",
            red: "#C51E14",
            green: "#1DC121",
            yellow: "#C7C329",
            blue: "#0A2FC4",
            magenta: "#C839C5",
            cyan: "#20C5C6",
            white: "#C7C7C7",
            lightBlack: "#686868",
            lightRed: "#FD6F6B",
            lightGreen: "#67F86F",
            lightYellow: "#FFFA72",
            lightBlue: "#6A76FB",
            lightMagenta: "#FD7CFC",
            lightCyan: "#68FDFE",
            lightWhite: "#FFFFFF",
            limeGreen: "#32CD32",
            lightCoral: "#F08080",
        },
        shell: "powershell.exe",
        windowSize: [600, 525],
        shellArgs: ["-NoLogo"],
        env: {},
        // Whether to use the WebGL renderer. Set it to false to use canvas-based
        // rendering (slower, but supports transparent backgrounds)
        webGLRenderer: true,
        webLinksActivationKey: "ctrl",
        disableLigatures: false,

        // https://hyper.is/#cfg
    },
    plugins: [],
    localPlugins: [],
    keymaps: {
        'editor:deletePreviousWord': 'ctrl+backspace',
        'editor:deleteNextWord': 'ctrl+del',
    },
};
//# sourceMappingURL=config-default.js.map
