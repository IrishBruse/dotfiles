#!/usr/bin/env bash
# Open ~/dotfiles in VS Code (Electron) and move that window to special:special.
# Window rules cannot do this alone: Code forks, and the folder name appears in the title only after load.

set -eu

hyprctl dispatch workspace special
code "$HOME/dotfiles" 
