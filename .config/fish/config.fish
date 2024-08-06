switch (uname)
    case Darwin
        /opt/homebrew/bin/brew shellenv | source

    case '*'
end

fish_add_path -g ~/.local/bin
zoxide init fish --cmd cd | source
fzf --fish | source
fnm env --use-on-cd | source

set -U fish_greeting
set fish_color_valid_path
set -x EDITOR code
set -x JQ_COLORS "2;33:2;33:0;33:0;36:1;32:0;35:1;35:2;34"


function fish_title
    echo test
end


fish_add_path -g ~/go/bin


source ~/dotfiles/local.fish


alias bat="bat --theme OneHalfDark --style grid,numbers"
alias lz="lazygit"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="exec fish -C clear"
alias paths="echo $PATH | tr ':' '\n'"
alias clip="fish_clipboard_copy"
alias dot="code ~/dotfiles/"
alias clone="git clone --recursive"


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
