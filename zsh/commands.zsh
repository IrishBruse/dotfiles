alias cd="z"
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

lazynvm() {
  unset -f nvm node npm yarn
  export NVM_DIR=~/.nvm
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm
}

nvm() {
  lazynvm
  nvm $@
}

node() {
  lazynvm
  nvm use
  node $@
}

npm() {
  lazynvm
  nvm use
  npm $@
}

yarn() {
  lazynvm
  nvm use
  yarn $@
}
