#!/usr/bin/env fish

set -l repo (path dirname (status filename))

brew bundle dump --no-vscode -f --file=$repo/misc/Brewfile
/opt/homebrew/bin/brew shellenv >$repo/home/.config/fish/conf.d/brew.fish
