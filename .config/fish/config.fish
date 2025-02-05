switch (set -q OS && echo $OS || uname)
    case Darwin
        /opt/homebrew/bin/brew shellenv | source
        alias apc="sudo chown -R $(whoami) '/Applications/Visual Studio Code.app/Contents/Resources/app/out/main.js'"
        alias code="code --ignore-certificate-errors"
        alias sed="gsed"
        alias chrome "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --silent-debugger-extension-api 2> /dev/null"
        set -gx HOMEBREW_NO_ENV_HINTS 1

    case Linux
        alias apc="sudo chown -R $(whoami) '/usr/share/code/resources/app/out/main.js'"
        fish_add_path -g ~/.local/share/fnm/
        alias neofetch neowofetch

        for opt in (command ls /opt/)
            fish_add_path -g "/opt/$opt"
        end

    case '*'
        echo 'Unknown OS: '(uname)
end

fish_add_path -g ~/go/bin

zoxide init fish --cmd cd | source
fzf --fish | source
fnm env | source

set -U fish_greeting
set -g fish_color_valid_path
set -x EDITOR code
set -gx JQ_COLORS "0;34:0;34:0;34:0;37:0;32:0;37:0;37:0;31"

set -g __fish_git_prompt_showcolorhints 1
set -g __fish_git_prompt_color_branch blue
set -g fish_color_error red

set -x fish_help_browser google-chrome
set -x BROWSER none

abbr patch "npm version patch --force --git-tag-version=false"

function setgx
    set -gx $argv[1] $argv[2]
    if test $status -eq 0
        echo "Set $argv[1]"
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

function clone
    set repoURL (echo $argv[1] | string trim -l -c "https://" | string split "/")
    set -l folder (echo $repoURL[3] | string split ".")

    git clone --recursive -- $argv[1] $folder[1]
end

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

function fnm
    command fnm $argv
end

alias gsrp="git stash && git pull --rebase && git stash pop"


alias bat="bat --theme OneHalfDark --style grid,numbers"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="clear;exec fish"
alias paths="echo $PATH | tr ':' '\n'"
alias ldtkgen="dotnet run --project /home/econn/git/LDtkMonogame/LDtk.Codegen/LDtk.Codegen.csproj"

alias showkey="fish_key_reader --verbose"

# Node alias
alias nid "ni -D"

abbr nvm fnm

function nu
    npm install --save $argv[1]"@latest"
end

function nr --wraps "npm run"
    command nr $argv
end

abbr clone "git clone --recursive"
abbr gsrp "git stash && git pull --rebase && git stash pop"

abbr jc "jira issue create -t=Task -a=econneely --custom feature-team=dynaFormRaptors --web"
