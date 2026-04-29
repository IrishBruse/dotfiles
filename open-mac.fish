#!/usr/bin/env fish

set -l repo (path dirname (status filename))

brew bundle dump --no-vscode -f --file=$repo/Brewfile
/opt/homebrew/bin/brew shellenv >$repo/.config/fish/conf.d/brew.fish
