fnm env --use-on-cd --shell fish | source

set -gx ANDROID_HOME /usr/lib/android-sdk

set -x EDITOR nano
set -gx JQ_COLORS "0;34:0;34:0;34:0;37:0;32:0;37:0;37:0;31"

set -gx DOTNET_WATCH_RESTART_ON_RUDE_EDIT 1
set -gx DOTNET_SYSTEM_CONSOLE_ALLOW_ANSI_COLOR_REDIRECTION true

source ~/dotfiles/local.fish

function on_change_pwd --on-variable PWD
    status --is-command-substitution; and return
    set -l repo (echo $PWD | string replace ~/git/ "")

    local_onchange_repo $repo
end

on_change_pwd

function v
    if test (count $argv) -eq 0
        code .
    else
        code $argv
    end
end

function watch -a command time
    if not set -q time[1]
        set time 1
    end
    while true
        fish -c $command
        sleep $time
    end
end

function envs
    command env | sort | fzf
end

function paths
    echo $PATH | string split ' ' | sort | fzf
end

alias clip fish_clipboard_copy
alias rm trash
alias bat="bat --theme OneHalfDark ---style grid,numbers"
alias ls="eza -l --no-permissions --no-user --time-style relative --group-directories-first"
alias ll="eza -la --no-permissions --group-directories-first"
alias la=ll
alias reload="clear;exec fish"
alias ldtkgen="dotnet run --project /home/econn/git/LDtkMonogame/LDtk.Codegen/LDtk.Codegen.csproj"

alias showkey="fish_key_reader --verbose"

# Node alias
abbr nvm fnm

# Keybinds
bind ctrl-w backward-kill-word

alias stow="echo 'use ./stow.fish'"
