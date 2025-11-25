# fish_add_path -g ~/.local/share/fnm/
# alias neofetch fastfetch
# alias rm trash
# set -x BROWSER google-chrome
# set -gx ANDROID_HOME /usr/lib/android-sdk
# export DOTNET_ROOT=/usr/share/dotnet

# for opt in (command ls /opt/)
#     fish_add_path -g "/opt/$opt"
# end

# Global

fnm env --use-on-cd --shell fish | source

set -x EDITOR "code --wait"
set -gx JQ_COLORS "0;34:0;34:0;34:0;37:0;32:0;37:0;37:0;31"

set -gx DOTNET_WATCH_RESTART_ON_RUDE_EDIT 1
set -gx DOTNET_SYSTEM_CONSOLE_ALLOW_ANSI_COLOR_REDIRECTION true

function apc
    if test (uname) = Linux
        sudo chown -R $(whoami) /usr/share/code/
    else
        sudo chown -R $(whoami) '/Applications/Visual Studio Code.app/Contents/'
    end
end

function jwt
    set splits (echo $argv[1] | string split ".")
    string join "" (echo $splits[2]) "==" | base64 --decode | jq
end

function base64pad
    echo $argv
    set base64_string YWJjZA
    while test (math (string length $base64_string) % 4) -ne 0
        set base64_string "$base64_string="
    end
    echo $base64_string
end

source ~/dotfiles/local.fish

function on_change_pwd --on-variable PWD
    status --is-command-substitution; and return
    set -l repo (echo $PWD | string replace ~/git/ "")

    local_onchange_repo $repo
end

on_change_pwd

function clip
    fish_clipboard_copy
end

function pretty
    jq -Rr '. as $line | try (fromjson) catch $line' --color-output
end

function sam-dev
    nr build
    if test $status -ne 0
        return
    end
    nr cfn-lint
    if test $status -ne 0
        return
    end
    sam local start-api --config-file samconfig-ephemeral.toml $argv 2>&1 | pretty
end

function sam-deploy
    sam build

    set -l configFile samconfig-ephemeral.toml

    sam deploy --config-file $configFile $argv
end

function v
    if test (count $argv) -eq 0
        code .
    else
        code $argv
    end
end

function watch -a command
    while true
        fish -c $command
        sleep 1
    end
end

# Git
abbr gs "git status"
abbr ga "git add ."
abbr clone "git clone --recursive"

function gc
    if test (count $argv) -gt 0
        git commit -m "$argv"
    else
        git commit
    end
end

function envs
    command env | sort | fzf
end

function paths
    echo $PATH | string split ' ' | sort | fzf
end

alias bat="bat --theme OneHalfDark ---style grid,numbers"
alias ls="eza -ax --no-user --time-style relative --group-directories-first"
alias ll="eza -al --no-user --time-style relative --group-directories-first"
alias reload="clear;exec fish"
alias ldtkgen="dotnet run --project /home/econn/git/LDtkMonogame/LDtk.Codegen/LDtk.Codegen.csproj"

alias showkey="fish_key_reader --verbose"

# Node alias
abbr nvm fnm

# Keybinds
bind ctrl-w backward-kill-word

# set -gx FORCE_COLOR true
