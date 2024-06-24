alias cd="z"
alias lz="lazygit"
alias ls="eza -a"
alias zshrc="code ~/dotfiles/zsh/zshrc.sh"
alias watch="watch exec"
alias reload="exec zsh"

alias dot="code ~/dotfiles/"

c() {
    if [ $# -eq 0 ]
    then
        code .
    else
        code $1
    fi
}
