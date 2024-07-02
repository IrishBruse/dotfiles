source functions.sh

sudo apt update

echo source ~/dotfiles/zsh/zshrc.sh > ~/.zshrc

curl -s https://ohmyposh.dev/install.sh | sudo bash -s

curl "https://github.com/godotengine/godot-builds/releases/download/4.3-beta2/Godot_v4.3-beta2_mono_linux_x86_64.zip"

echo "fzf"
sudo apt install -y zsh fzf
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
chsh -s $(which zsh)

echo "lutris"
echo "deb [signed-by=/etc/apt/keyrings/lutris.gpg] https://download.opensuse.org/repositories/home:/strycore/Debian_12/ ./" | sudo tee /etc/apt/sources.list.d/lutris.list > /dev/null
wget -q -O- https://download.opensuse.org/repositories/home:/strycore/Debian_12/Release.key | gpg --dearmor | sudo tee /etc/apt/keyrings/lutris.gpg > /dev/null
sudo apt update
sudo apt install lutris

echo "eza"
sudo mkdir -p /etc/apt/keyrings
wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
sudo apt update
sudo apt install -y eza

echo "Node js lts"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

source ~/.bashrc

nvm install --lts --default

echo "git delta"
installDeb "https://github.com/dandavison/delta/releases/download/0.17.0/git-delta_0.17.0_amd64.deb"

echo "Google Chrome"
installDeb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"

echo "CaskaydiaCove"
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaCode.zip -O /tmp/CascadiaCode.zip
mkdir -p ~/.fonts/CaskaydiaCove/
unzip /tmp/CascadiaCode.zip -d ~/.fonts/CaskaydiaCove/

echo "CaskaydiaMono"
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaMono.zip -O /tmp/CascadiaMono.zip
mkdir -p ~/.fonts/CaskaydiaMono/
unzip /tmp/CascadiaMono.zip -d ~/.fonts/CaskaydiaMono/

echo "VSCode"
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt install apt-transport-https
sudo apt update
sudo apt install code

echo "dconf"
dconf load /org/cinnamon/ < cinnamon.ini
dconf load /org/nemo/ < nemo.ini

echo "wezterm"
curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/wezterm-fury.gpg
echo 'deb [signed-by=/usr/share/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
sudo apt update
sudo apt install wezterm

installZip "https://github.com/godotengine/godot-builds/releases/download/4.3-beta2/Godot_v4.3-beta2_mono_linux_x86_64.zip" ~/Apps/
installZip $(gh api /repos/mtkennerly/ludusavi/releases/latest --jq ".assets[2].browser_download_url")
installDeb "https://discord.com/api/download?platform=linux&format=deb"

sudo apt install dconf-editor
sudo apt install dotnet-sdk-8.0
sudo apt install scrcpy
sudo apt install tldr
sudo apt install zsh
sudo apt install jq

echo "GH cli"

(type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
&& sudo mkdir -p -m 755 /etc/apt/keyrings \
&& wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt update \
&& sudo apt install gh -y
