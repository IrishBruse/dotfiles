export ZSH="$HOME/.oh-my-zsh"

# Uncomment the following line to enable command auto-correction.
ENABLE_CORRECTION="true"

COMPLETION_WAITING_DOTS="true"

plugins=(git dotnet)

source $ZSH/oh-my-zsh.sh

# Example aliases
alias clone="git clone --recursive "
alias \$=" "

PROMPT="%{$fg[green] $fg[$NCOLOR]%}%c → %{$reset_color%}"
RPROMPT="Test"
