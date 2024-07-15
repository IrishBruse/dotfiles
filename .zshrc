source ~/dotfiles/zsh/zshrc.zsh

autoload -Uz compinit
zstyle ':completion:*' menu select
fpath+=~/.zfunc

source ~/dotfiles/.zshrc.local
