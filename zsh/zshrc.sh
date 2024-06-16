eval "$(oh-my-posh init zsh --config ~/dotfiles/zsh/oh-my-posh.yaml)"

source ~/dotfiles/zsh/nvm.sh

# alias
alias cd="z"
alias lg="lazygit"
alias ls="eza -a"
alias zshrc="code ~/dotfiles/zsh/zshrc.sh"
alias watch="watch exec"

alias dot="code ~/dotfiles/"

c() {
    if [ $# -eq 0 ]
    then
        code .
    else
        code $1
    fi
}


eval "$(zoxide init zsh)"
source <(fzf --zsh)

ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"

autoload -Uz compinit
compinit

[ -f ~/gh.sh ] && source ~/gh.sh

source "${ZINIT_HOME}/zinit.zsh"

zinit light zpm-zsh/clipboard # pipe to clip
zinit light zsh-users/zsh-completions # ghost text completion
zinit light zsh-users/zsh-autosuggestions
zinit snippet 'https://github.com/robbyrussell/oh-my-zsh/raw/master/plugins/git/git.plugin.zsh'
