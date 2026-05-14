#!/usr/bin/env fish

set -l repo (path dirname (status filename))

dconf dump / >$repo/home/.config/dconf/user.ini

mkdir -p $repo/home/.cursor
test -f ~/.cursor/cli-config.json
and jq '.permissions // {}' ~/.cursor/cli-config.json >$repo/home/.cursor/permissions.json
