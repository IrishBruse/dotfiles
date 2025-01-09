#!/bin/bash

# Function to get the latest version
get_latest_version() {
    curl -I https://discord.com/api/download?platform=linux&format=deb 2>/dev/null | \
    grep -oP "discord-[\d\.]+\.deb" | grep -oP "[\d\.]+"
}

# Function to get the installed version
get_installed_version() {
    discord --version 2>/dev/null | grep -oP "[\d\.]+"
}

# Function to download, install, and launch Discord
install_and_run_update() {
    echo "Downloading Discord version $latest_version..."
    wget -O discord.deb "https://discord.com/api/download?platform=linux&format=deb"
    echo "Installing Discord version $latest_version..."
    sudo dpkg -i discord.deb
    echo "Cleaning up..."
    rm discord.deb
    echo "Discord has been updated to version $latest_version."
    echo "Launching Discord..."
    discord
}

# Main script logic
latest_version=$(get_latest_version)
installed_version=$(get_installed_version)

if [ -z "$installed_version" ]; then
    echo "Discord is not installed. Installing the latest version ($latest_version)..."
    install_and_run_update
elif [ "$latest_version" != "$installed_version" ]; then
    echo "An update is available: $latest_version (installed: $installed_version)"
    install_and_run_update
else
    echo "Discord is up to date (version: $installed_version)."
    echo "Launching Discord..."
    discord &
fi
