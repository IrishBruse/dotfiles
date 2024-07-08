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
