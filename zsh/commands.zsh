alias cd="z"
alias ..="cd .."
alias lz="lazygit"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="echo 'Reloading enviroment variables';exec zsh"
alias path="echo $PATH | tr ':' '\n'"

alias econneely="gh auth switch --user econneely"
alias irishbruse="gh auth switch --user IrishBruse"

alias dot="code ~/dotfiles/"
alias find="fzf | clip"

c() {
    if [ $# -eq 0 ]
    then
        code .
    else
        code $1
    fi
}

# Git commands

alias clone="git clone --recursive"

wclone() {
  git clone --bare
}

gwa() {
    git workload add -b $1 $1
}

gwa() {
    git workload list
}

nvm() {
  unset -f nvm
  lazynvm
  nvm $@
}

node() {
  unset -f node
  nvm use
  node $@
}

npm() {
  unset -f npm
  nvm use
  npm $@
}

yarn() {
  unset -f yarn
  nvm use
  yarn $@
}
