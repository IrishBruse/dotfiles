function installDeb() {
    TEMP_DEB="$(mktemp)" &&
    wget -O "$TEMP_DEB" "$1" &&
    sudo dpkg -i "$TEMP_DEB"
    rm -f "$TEMP_DEB"
}

function installZip() {
    TEMP_ZIP="$(mktemp)" &&
    wget "$1" -O "$TEMP_ZIP"
    mkdir -p "$2"
    unzip "$TEMP_ZIP" -d "$2"
}
