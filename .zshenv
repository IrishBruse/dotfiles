export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

path() {
    export PATH="$1:$PATH"
}

path $HOME/go/bin

export EDITOR="code"
export HISTFILE="$HOME/.zsh_history"
export HISTSIZE=1000000000
export SAVEHIST=1000000000

source ~/dotfiles/.zshenv.local
