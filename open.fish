#!/usr/bin/env fish

if test (uname) = Linux
    dconf read /com/linuxmint/install/installed-apps | string replace -a \' \" | jq >misc/apt.json
    dconf dump / >.config/dconf/user.ini
end

if test (uname) = Darwin
    brew bundle dump --no-vscode -f --file=misc/Brewfile
    /opt/homebrew/bin/brew shellenv >.config/fish/conf.d/brew.fish
end

zoxide init fish --cmd cd >.config/fish/conf.d/zoxide.fish
fzf --fish >.config/fish/conf.d/fzf.fish
