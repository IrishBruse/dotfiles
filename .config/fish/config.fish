fish_add_path -g ~/.local/bin
fish_add_path -g ~/go/bin
fish_add_path -g ~/Android/Sdk/cmdline-tools/latest/bin
fish_add_path -g ~/Android/Sdk/platform-tools
fish_add_path -g ~/Android/Sdk/build-tools
fish_add_path -g ~/.local/bin/flutter/bin
fish_add_path -g /usr/local/go/bin

alias ..="cd .."
alias lz="lazygit"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="echo 'Reloading enviroment variables';exec fish"
alias path="echo $PATH | tr ':' '\n'"
alias clip="fish_clipboard_copy"
alias dot="code ~/dotfiles/"
alias clone="git clone --recursive"

set -U fish_greeting
set fish_color_valid_path
set -x EDITOR "code"

bind \x08 'backward-kill-bigword'
bind \x09 'kill-bigword'

oh-my-posh init fish --config ~/.config/fish/oh-my-posh.yaml | source
zoxide init fish --cmd cd | source
fzf --fish | source

function c
    if test (count $argv) -eq 0
        code .
    else
        code $argv
    end
end

function node
    nvm use
    command node $argv
end

function npm
    nvm use
    command npm $argv
end

function yarn
    nvm use
    command yarn $argv
end

function ni
    nvm use
    command ni $argv
end

function nr
    nvm use
    command nr $argv
end

function nx
    nvm use
    command nlx $argv
end
