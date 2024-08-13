installDeb() {
    TEMP_DEB="$(mktemp)" &&
    wget -O "$TEMP_DEB" "$1" &&
    sudo dpkg -i "$TEMP_DEB"
    rm -f "$TEMP_DEB"
}

installZip() {
    TEMP_ZIP="$(mktemp)" &&
    wget "$1" -O "$TEMP_ZIP"
    mkdir -p "$2"
    unzip "$TEMP_ZIP" -d "$2"
}

installTar() {
    TEMP="$(mktemp)" &&
    wget "$1" -O "$TEMP"
    mkdir -p "$2"
    tar -xf "$TEMP" -C "$2"
}

header() {
    echo $1
}

sudo apt update

echo source ~/dotfiles/zsh/zshrc.sh > ~/.zshrc
curl -s https://ohmyposh.dev/install.sh | sudo bash -s
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh

curl "https://github.com/godotengine/godot-builds/releases/download/4.3-beta2/Godot_v4.3-beta2_mono_linux_x86_64.zip"

header "fzf"
installTar "https://github.com/junegunn/fzf/releases/download/0.53.0/fzf-0.53.0-linux_amd64.tar.gz" ~/.local/bin/

curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
chsh -s $(which zsh)

header "lutris"
echo "deb [signed-by=/etc/apt/keyrings/lutris.gpg] https://download.opensuse.org/repositories/home:/strycore/Debian_12/ ./" | sudo tee /etc/apt/sources.list.d/lutris.list > /dev/null
wget -q -O- https://download.opensuse.org/repositories/home:/strycore/Debian_12/Release.key | gpg --dearmor | sudo tee /etc/apt/keyrings/lutris.gpg > /dev/null
sudo apt update
sudo apt install lutris

header "eza"
sudo mkdir -p /etc/apt/keyrings
wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
sudo apt update
sudo apt install -y eza

header "git delta"
installDeb "https://github.com/dandavison/delta/releases/download/0.17.0/git-delta_0.17.0_amd64.deb"

header "Google Chrome"
installDeb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"

header "CaskaydiaCove"
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaCode.zip -O /tmp/CascadiaCode.zip
mkdir -p ~/.fonts/CaskaydiaCove/
unzip /tmp/CascadiaCode.zip -d ~/.fonts/CaskaydiaCove/

header "CaskaydiaMono"
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaMono.zip -O /tmp/CascadiaMono.zip
mkdir -p ~/.fonts/CaskaydiaMono/
unzip /tmp/CascadiaMono.zip -d ~/.fonts/CaskaydiaMono/

header "VSCode"
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt install apt-transport-https
sudo apt update
sudo apt install code
sudo chown -R $(whoami) /usr/share/code

header "dconf"
dconf load /org/cinnamon/ < cinnamon.ini
dconf load /org/nemo/ < nemo.ini

header "wezterm"
curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/wezterm-fury.gpg
echo 'deb [signed-by=/usr/share/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
sudo apt update
sudo apt install wezterm

installZip "https://github.com/godotengine/godot-builds/releases/download/4.3-beta2/Godot_v4.3-beta2_mono_linux_x86_64.zip" ~/Apps/
installZip $(gh api /repos/mtkennerly/ludusavi/releases/latest --jq ".assets[2].browser_download_url")

installDeb "https://discord.com/api/download?platform=linux&format=deb"
sh -c "$(curl -sS https://raw.githubusercontent.com/Vendicated/VencordInstaller/main/install.sh)"

sudo apt install dconf-editor
sudo apt install dotnet-sdk-8.0
sudo apt install scrcpy
sudo apt install tldr
sudo apt install jq
sudo apt install gpick
sudo apt install entr
sudo apt install usrmerge

header "GH cli"
(type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
&& sudo mkdir -p -m 755 /etc/apt/keyrings \
&& wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt update \
&& sudo apt install gh -y

header "Clipboard Manager"
sudo apt install parcellite
sudo apt install xdotool

header "Java"
sudo apt install openjdk-17-jre
sudo apt install openjdk-17-jdk

header "Android SDK"
sdkmanager "build-tools;35.0.0"
sdkmanager "platform-tools"

open https://gitlab.com/volian/nala/-/releases

sudo add-apt-repository ppa:zhangsongcui3371/fastfetch
sudo apt update
sudo apt install fastfetch

# Remove xed as vscode is now installed
sudo apt uninstall xed
npm i -g @antfu/ni

sudo apt-add-repository ppa:fish-shell/release-3
sudo apt update
sudo apt install fish

# fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Lazygit

LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin
