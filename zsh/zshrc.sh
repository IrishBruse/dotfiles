eval "$(oh-my-posh init zsh --config ~/dotfiles/zsh/oh-my-posh.toml)"

source ~/dotfiles/zsh/nvm.sh

# alias
alias cd="z"
alias lg="lazygit"
alias ls="eza -a"

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
