#!/usr/bin/env fish

if test (uname) = Linux
    uname
    dconf dump / >dconf-settings.ini
end

if test (uname) = Darwin
    uname
    brew list >${workspaceFolder}/brew.ini
end
