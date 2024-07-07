export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completio

export ANDROID_HOME="/home/econn/Android/Sdk/"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64/"

add() {
    export PATH="$1:$PATH"
}

add "/home/econn/Android/Sdk/cmdline-tools/latest/bin"
add "/home/econn/Android/Sdk/platform-tools"

export HISTFILE="$HOME/.zsh_history"
export HISTSIZE=1000000000
export SAVEHIST=1000000000
