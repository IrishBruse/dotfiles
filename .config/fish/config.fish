switch (set -q OS && echo $OS || uname)
    case Darwin
        /opt/homebrew/bin/brew shellenv | source
        alias apc="sudo chown -R $(whoami) '/Applications/Visual Studio Code.app/Contents/Resources/app/out/main.js'"
        alias code="code --ignore-certificate-errors"
        alias sed="gsed"
        alias chrome "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --silent-debugger-extension-api"

    case Linux
        alias apc="sudo chown -R $(whoami) '/usr/share/code/resources/app/out/main.js'"
        fish_add_path -g ~/Apps/Cemu/

    case '*'
        echo 'Unknown OS: '(uname)
end

alias bat="bat --theme OneHalfDark --style grid,numbers"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="clear;exec fish"
alias paths="echo $PATH | tr ':' '\n'"
alias ldtkgen="dotnet run --project /home/econn/git/LDtkMonogame/LDtk.Codegen/LDtk.Codegen.csproj"

alias showkey="fish_key_reader --verbose"

# Node alias
alias nx nlx
abbr nid "ni -D"
abbr nvm fnm

abbr clone "git clone --recursive"
abbr gsrp "git stash && git pull --rebase && git stash pop"

switch (echo $TERM_PROGRAM)
    case vscode
        set -g node_icon " "
    case '*'
        set -g node_icon " "
end

function prompt_update
    set fnm_version (command fnm current | string split .)
    set -g fish_node_version $fnm_version[1]
    if test "$fish_node_version" != ""
        set -g fish_node_version (echo $node_icon)$fish_node_version
    end
end

fish_add_path -g ~/.local/bin
zoxide init fish --cmd cd | source
fzf --fish | source
fnm env | source

function on_change_dir --on-variable PWD --description 'Change Node version on directory change'
    status --is-command-substitution; and return
    if test -f .node-version -o -f .nvmrc
        fnm use >/dev/null

        set -g fish_node_version ""
        prompt_update
    end
end

on_change_dir

set -U fish_greeting
set -g fish_color_valid_path
set -gx JQ_COLORS "0;33:0;34:0;34:1;33:0;32:0;37:0;37:0;31"

set -gx NODE_ENV development


set -gx EDITOR "code --wait"
set -gx HOMEBREW_NO_ENV_HINTS 1

set -g __fish_git_prompt_showcolorhints 1
set -g __fish_git_prompt_color_branch blue
set -g fish_color_error red
fish_add_path -g ~/go/bin

set -x CYPRESS_PASSWORD F98@qnyxibxm7v37g

function setgx
    set -gx $argv[1] $argv[2]
    if test $status -eq 0
        echo "Set $argv[1]"d
    end
end

function jwt -a jwt
    clear

    set splits (echo $argv[1] | string split ".")
    string join "" (echo $splits[2]) "==" | base64 --decode | jq
end

source ~/dotfiles/local.fish

function on_change_pwd --on-variable PWD
    status --is-command-substitution; and return
    set -l repo (echo $PWD | string replace ~/git/ "")

    set -g fish_git_branch ""
    set -g fish_git_branch (git branch --show-current 2>/dev/null)

    local_onchange_repo $repo

    switch (echo $repo)
        case "*"
    end
end

on_change_pwd

set -gx NI_DEFAULT_AGENT npm
set -gx NI_GLOBAL_AGENT npm

function view
    gh pr view -w

    if test $status -ne 0
        gh browse
    end
end

function clip
    fish_clipboard_copy
end

function pretty
    jq -Rr '. as $line | try (fromjson) catch $line'
end

function sam-dev
    sam build

    set -l configFile samconfig-ephemeral.toml
    set -l envVars env-vars-override-local.json

    sam local start-api -n .env.json --config-file $configFile --config-env $envVars $argv 2>&1 | pretty
end

function sam-deploy
    sam build

    set -l configFile samconfig-ephemeral.toml

    sam deploy --config-file $configFile
end

function v
    if test (count $argv) -eq 0
        code .
    else
        code $argv
    end
end

function fnm
    command fnm $argv
    prompt_update
end

function nr --wraps "npm run"
    command nr $argv
end
