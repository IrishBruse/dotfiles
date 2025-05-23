#!/usr/bin/env fish

if test (uname) = Linux
    dconf dump / >misc/dconf-settings.ini
    dconf read /com/linuxmint/install/installed-apps | string replace -a \' \" | jq >misc/apt.json
end

if test (uname) = Darwin
    echo \n\n"== Casks =="\n\n >misc/brew.ini
    brew list --casks >>misc/brew.ini

    echo \n\n"== Formula =="\n\n >>misc/brew.ini
    brew list --formula >>misc/brew.ini
end
