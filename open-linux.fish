#!/usr/bin/env fish

set -l repo (path dirname (status filename))

dconf read /com/linuxmint/install/installed-apps | string replace -a \' \" | jq >$repo/misc/apt.json
dconf dump / >$repo/home/.config/dconf/user.ini
