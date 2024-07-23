alias cd="z"
alias ..="cd .."
alias lz="lazygit"
alias ls="eza -ax --icons=always --group-directories-first"
alias ll="eza -al --icons=always --group-directories-first"
alias reload="echo 'Reloading enviroment variables';exec zsh"
alias path="echo $PATH | tr ':' '\n'"

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
    git worktree add -b $1 $1
}

gwl() {
    git worktree list
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

ni() {
  unset -f ni
  nvm use
  ni $@
}

nr() {
  unset -f nr
  nvm use
  nr $@
}

nx() {
  unset -f nx
  nvm use
  nlx $@
}
