eval "$(oh-my-posh init zsh --config ~/dotfiles/zsh/oh-my-posh.yaml)"
eval "$(zoxide init zsh)"
eval "$(fzf --zsh)"

export PATH=$PATH:~/go/bin

ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"

autoload -Uz compinit
compinit

source "${ZINIT_HOME}/zinit.zsh"

zinit light zpm-zsh/clipboard # pipe to clip
zinit light zsh-users/zsh-completions # ghost text completion
zinit light zsh-users/zsh-autosuggestions
zinit snippet 'https://github.com/robbyrussell/oh-my-zsh/raw/master/plugins/git/git.plugin.zsh'
zinit snippet ~/gh.sh

source ~/dotfiles/zsh/commands.zsh
source ~/gp.sh
source ~/secrets.sh
