
eval $(/usr/bin/gnome-keyring-daemon --start)

export SSH_AUTH_SOCK

mkdir -p "$HOME"/.local/share/keyrings
