#!/usr/bin/env fish

rm .cursor/ 2>/dev/null
mkdir .cursor/

# ln -s <real source> <symlinked target>

ln -fs ~/.cursor/mcp.json ~/dotfiles/.cursor 2>/dev/null || echo Skipped mcp.json
ln -fs ~/.cursor/cli-config.json ~/dotfiles/.cursor 2>/dev/null || echo Skipped cli-config.json
ln -fs ~/dotfiles/.agents/skills/ ~/.cursor/skills 2>/dev/null || echo Skipped .agents/skills/

set -l repo (path dirname (status filename))
acli completion fish >$repo/home/.config/fish/completions/acli.fish
