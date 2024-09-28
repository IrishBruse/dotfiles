#!/usr/bin/env fish

if test (uname) = Linux
    dconf dump / >dconf-settings.ini
    # ini del -s com/linuxmint/install -k installed-apps dconf-settings.ini
end

if test (uname) = Darwin
    brew list >${workspaceFolder}/brew.ini
end
