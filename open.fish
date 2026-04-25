#!/usr/bin/env fish

set -l repo (path dirname (status filename))

if test (uname) = Linux
    dconf read /com/linuxmint/install/installed-apps | string replace -a \' \" | jq >$repo/misc/apt.json
    dconf dump / >$repo/home/.config/dconf/user.ini
end

if test (uname) = Darwin
    brew bundle dump --no-vscode -f --file=$repo/misc/Brewfile
    /opt/homebrew/bin/brew shellenv >$repo/home/.config/fish/conf.d/brew.fish
end

zoxide init fish --cmd cd >$repo/home/.config/fish/conf.d/zoxide.fish
fzf --fish >$repo/home/.config/fish/conf.d/fzf.fish
