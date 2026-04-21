#!/usr/bin/env fish

acli completion fish >.config/fish/completions/acli.fish

rm .cursor/ 2>/dev/null
mkdir .cursor/

ln -s ~/.cursor/mcp.json ~/dotfiles/.cursor 2>/dev/null || echo Skipped mcp.json
ln -s ~/.cursor/cli-config.json ~/dotfiles/.cursor 2>/dev/null || echo Skipped cli-config.json
