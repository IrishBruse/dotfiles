#!/usr/bin/env fish

zoxide init fish --cmd cd >.config/fish/conf.d/zoxide.fish
fzf --fish >.config/fish/conf.d/fzf.fish

if test (uname) = Linux
    dconf dump / >misc/dconf-settings.ini
    dconf read /com/linuxmint/install/installed-apps | string replace -a \' \" | jq >misc/apt.json
end

if test (uname) = Darwin
    brew bundle dump --no-vscode -f --file=misc/Brewfile
    /opt/homebrew/bin/brew shellenv >.config/fish/conf.d/brew.fish
end
