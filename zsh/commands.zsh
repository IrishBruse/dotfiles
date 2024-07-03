alias ..="cd .."
alias ~="cd ~"
alias \#="print "
alias cd="z"
alias lz="lazygit"
alias ls="eza -a --icons=always"
alias ll="eza -al --icons=always"
alias watch="watch exec"
alias reload="echo 'Reloading enviroment variables';exec zsh"
alias path="echo $PATH | tr ':' '\n'"
alias econneely="gh auth switch --user econneely"
alias irishbruse="gh auth switch --user IrishBruse"
alias clone="git clone --recursive"

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
