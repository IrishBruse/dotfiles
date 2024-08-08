switch (uname)
    case Darwin
        /opt/homebrew/bin/brew shellenv | source

    case '*'
end

fish_add_path -g ~/.local/bin
zoxide init fish --cmd cd | source
fzf --fish | source
fnm env | source

function on_change_dir --on-variable PWD --description 'Change Node version on directory change'
    status --is-command-substitution; and return
    if test -f .node-version -o -f .nvmrc
        fnm use --silent-if-unchanged >/dev/null
    end
end

on_change_dir

set -U fish_greeting
set fish_color_valid_path
set -x EDITOR "code --wait"
set -x JQ_COLORS "2;33:2;33:0;33:0;36:1;32:0;35:1;35:2;34"
set -U async_prompt_functions fish_right_prompt
set -x __fish_git_prompt_showcolorhints 1

fish_add_path -g ~/go/bin


source ~/dotfiles/local.fish


alias bat="bat --theme OneHalfDark --style grid,numbers"
alias lz="lazygit"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="exec fish -C clear"
alias paths="echo $PATH | tr ':' '\n'"
alias dot="code ~/dotfiles/"
alias nvm="fnm"
alias code="code --force-device-scale-factor=0.9"

function clone
    set repoURL (echo $argv[1] | string trim -l -c "https://" | string split "/")
    set -l repo (repoURL[3] | string split ".")

    echo repo[1]
end

function clip
    fish_clipboard_copy
end

function pretty
    jq -Rr '. as $line | try (fromjson) catch $line'
end

function v
    if test (count $argv) -eq 0
        code .
    else
        code $argv
    end
end
