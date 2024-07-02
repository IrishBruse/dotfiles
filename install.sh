echo source ~/dotfiles/zsh/zshrc.sh > ~/.zshrc

# fzf
sudo apt install -y zsh fzf
curl -s https://ohmyposh.dev/install.sh | bash -s
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
chsh -s $(which zsh)

# lutris
echo "deb [signed-by=/etc/apt/keyrings/lutris.gpg] https://download.opensuse.org/repositories/home:/strycore/Debian_12/ ./" | sudo tee /etc/apt/sources.list.d/lutris.list > /dev/null
wget -q -O- https://download.opensuse.org/repositories/home:/strycore/Debian_12/Release.key | gpg --dearmor | sudo tee /etc/apt/keyrings/lutris.gpg > /dev/null
sudo apt update
sudo apt install lutris

# eza
sudo mkdir -p /etc/apt/keyrings
wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
sudo apt update
sudo apt install -y eza

# Node js lts
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

source ~/.bashrc

nvm install --lts --default

# git delta
wget https://github.com/dandavison/delta/releases/download/0.17.0/git-delta_0.17.0_amd64.deb -O /tmp/git-delta.deb
sudo apt isntall /tmp/git-delta.deb

# Google Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/google-chrome-stable.deb
sudo apt install /tmp/google-chrome-stable.deb

# CaskaydiaCove
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaCode.zip -O /tmp/CascadiaCode.zip
mkdir -p ~/.fonts/CaskaydiaCove/
unzip /tmp/CascadiaCode.zip -d ~/.fonts/CaskaydiaCove/

# CaskaydiaMono
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaMono.zip -O /tmp/CascadiaMono.zip
mkdir -p ~/.fonts/CaskaydiaMono/
unzip /tmp/CascadiaMono.zip -d ~/.fonts/CaskaydiaMono/

# VSCode
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt install apt-transport-https
sudo apt update
sudo apt install code

# dconf
dconf load /org/cinnamon/ < cinnamon.ini
dconf load /org/nemo/ < nemo.ini

# wezterm
curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/wezterm-fury.gpg
echo 'deb [signed-by=/usr/share/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
sudo apt update
sudo apt install wezterm

#

sudo apt install dconf-editor
