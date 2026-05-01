#!/usr/bin/env fish

set -l repo (path dirname (status filename))
mkdir -p $repo/.cursor ~/.cursor
ln -fs ~/.cursor/mcp.json ~/.cursor/cli-config.json $repo/.cursor/
# rm first: re-run ln -fs with dest a symlink to the same dir creates nested duplicate dirs (GNU ln).
rm -rf ~/.cursor/skills ~/.cursor/rules
ln -s $repo/.agents/skills ~/.cursor/skills
ln -s $repo/.agents/rules ~/.cursor/rules

acli completion fish >$repo/home/.config/fish/completions/acli.fish; or true
zoxide init fish --cmd cd >$repo/home/.config/fish/conf.d/zoxide.fish; or true
fzf --fish >$repo/home/.config/fish/conf.d/fzf.fish; or true
