#!/usr/bin/env fish

set -l repo (path dirname (status filename))

dconf dump / >$repo/home/.config/dconf/user.ini
