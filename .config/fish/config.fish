switch (uname)
    case Darwin
        /opt/homebrew/bin/brew shellenv | source
        alias apc="sudo chown -R $(whoami) '/Applications/Visual Studio Code.app/Contents/Resources/app/out/main.js'"
        alias code="code --ignore-certificate-errors"

    case Linux
        if test "$XDG_VTNR" = 1 && not set -q DISPLAY
            exec startx
        end
        alias apc="sudo chown -R $(whoami) '/usr/share/code/resources/app/out/main.js'"

    case '*'
        echo 'Unknown OS: '(uname)
end

alias let="set -l"

switch (echo $TERM_PROGRAM)
    case vscode
        set -g node_icon " "
    case '*'
        set -g node_icon " "
end

function prompt_update
    set -l fnm_version (command fnm current | string split .)
    set -g fish_node_version $fnm_version[1]
    if test $fish_node_version != ""
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
set -x EDITOR "code --wait"
set -gx JQ_COLORS "0;34:0;34:0;34:0;37:0;32:0;37:0;37:0;31"

set -g __fish_git_prompt_showcolorhints 1
set -g __fish_git_prompt_color_branch blue
set -g fish_color_error red
fish_add_path -g ~/go/bin

set -x CYPRESS_PASSWORD F98@qnyxibxm7v37g

function setgx
    set -gx $argv[1] $argv[2]
    if test $status -eq 0
        echo "Set $argv[1]"
    end
end

source ~/dotfiles/local.fish

function on_change_pwd --on-variable PWD
    status --is-command-substitution; and return
    set -l repo (echo $PWD | string replace ~/git/ "")

    set -g fish_git_branch ""
    set -g fish_git_branch (git branch --show-current 2>/dev/null)

    if test "$TESTING" != true
        local_onchange_repo $repo
    end

    switch (echo $repo)
        case "*"
    end
end

on_change_pwd

set -x NI_DEFAULT_AGENT npm
set -x NI_GLOBAL_AGENT npm

function view
    gh pr view -w

    if test $status -ne 0
        gh browse
    end
end

function clone
    set repoURL (echo $argv[1] | string trim -l -c "https://" | string split "/")
    set -l folder (echo $repoURL[3] | string split ".")

    git clone --recursive -- $argv[1] $folder[1]
end

function clip
    fish_clipboard_copy
end

function pretty
    jq -Rr '. as $line | try (fromjson) catch $line'
end

function sam-dev
    sam build
    sam local start-api -n .env.json --config-file samconfig-ephemeral.toml $argv --skip-pull-image 2>&1 | pretty
end

function sam-deploy
    sam build
    sam deploy --config-file samconfig-ephemeral.toml
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

alias gsrp="git stash && git pull --rebase && git stash pop"

alias bat="bat --theme OneHalfDark --style grid,numbers"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="clear;exec fish"
alias paths="echo $PATH | tr ':' '\n'"
alias dot="code ~/dotfiles/"
alias back="cd $fish_back_pwd"
alias ldtkgen="dotnet run --project /home/econn/git/LDtkMonogame/LDtk.Codegen/LDtk.Codegen.csproj"

alias lz="lazygit"
alias nvm="fnm"

alias npx="nlx"
alias nid="ni -D"

function nr --wraps "npm run"
    command nr $argv
end
