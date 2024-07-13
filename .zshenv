export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completio

export ANDROID_HOME=$(realpath ~/Android/Sdk/)
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64/"

export CC=/bin/gcc
export CXX=/bin/g++
export CMAKE_C_COMPILER=/bin/gcc
export CMAKE_CXX_COMPILER=/bin/g++

add() {
    export PATH="$1:$PATH"
}

add $HOME/Android/Sdk/cmdline-tools/latest/bin
add $HOME/Android/Sdk/platform-tools
add $HOME/Android/Sdk/cmdline-tools/latest/bin
add $HOME/Android/Sdk/platform-tools
add $HOME/Android/Sdk/build-tools
add /usr/local/go/bin
add $HOME/go/bin
add $HOME/.local/bin/flutter

export HISTFILE="$HOME/.zsh_history"
export HISTSIZE=1000000000
export SAVEHIST=1000000000

export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export PATH=~/go/bin:$PATH

export EDITOR="code"
