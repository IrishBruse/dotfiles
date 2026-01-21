while true; do
    if hyprctl clients -j | jq -e ".[] | select(.$1 == \"$2\")" > /dev/null; then
        break
    fi
    notify-send "loop"
    sleep 1
done