#!/usr/bin/env fish

set -l repo (path dirname (status filename))
mkdir -p $repo/.cursor ~/.cursor

acli completion fish >$repo/home/.config/fish/completions/acli.fish; or true
zoxide init fish --cmd cd >$repo/home/.config/fish/conf.d/zoxide.fish; or true
fzf --fish >$repo/home/.config/fish/conf.d/fzf.fish; or true
