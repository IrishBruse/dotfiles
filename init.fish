#!/usr/bin/env fish

set -l repo (path dirname (status filename))
mkdir -p $repo/.cursor ~/.cursor
ln -fs ~/.cursor/mcp.json ~/.cursor/cli-config.json $repo/.cursor/
# rm first: re-run ln -fs with dest a symlink to the same dir creates .agents/skills/skills (GNU ln).
rm -rf ~/.cursor/skills
ln -s $repo/.agents/skills ~/.cursor/skills

acli completion fish >$repo/home/.config/fish/completions/acli.fish
