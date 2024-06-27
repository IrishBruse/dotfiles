alias cd="z"
alias lz="lazygit"
alias ls="eza -a"
alias ll="eza -al"
alias watch="watch exec"
alias reload="echo 'Reloading enviroment variables';exec zsh"
alias path="echo $PATH | tr ':' '\n'"
alias ..="cd .."
alias ~="cd ~"
alias econneely="gh auth switch --user econneely"
alias irishbruse="gh auth switch --user IrishBruse"

alias zshrc="code ~/dotfiles/zsh/zshrc.sh"
alias dot="code ~/dotfiles/"

c() {
    if [ $# -eq 0 ]
    then
        code .
    else
        code $1
    fi
}
