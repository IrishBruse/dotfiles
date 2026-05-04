fnm env --use-on-cd --shell fish | source

set -gx ANDROID_HOME /usr/lib/android-sdk

set -x EDITOR code --wait
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

alias clip fish_clipboard_copy
alias rm trash
alias bat="bat --theme OneHalfDark ---style grid,numbers"
alias la="eza -l --no-permissions --no-user --time-style relative --group-directories-first"
alias ll="eza -la --no-permissions --group-directories-first"
alias reload="clear;exec fish"

alias ac="agent --continue"
alias a="agent"
alias ap="agent --mode=plan agent"
alias aa="agent --mode=ask agent"

alias showkey="fish_key_reader --verbose"

abbr neofetch fastfetch

# Scripts
alias ldtkgen="dotnet run --project /home/econn/git/LDtkMonogame/LDtk.Codegen/LDtk.Codegen.csproj"

# Node alias
abbr nvm fnm

alias stow="echo 'use ./stow.fish'"
