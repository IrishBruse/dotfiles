export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completio

export ANDROID_HOME="~/Android/Sdk/"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64/"

add() {
    export PATH="$1:$PATH"
}

add "~/Android/Sdk/cmdline-tools/latest/bin"
add "~/Android/Sdk/platform-tools"

export HISTFILE="$HOME/.zsh_history"
export HISTSIZE=1000000000
export SAVEHIST=1000000000

export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export PATH=~/go/bin:$PATH

export EDITOR="code"
