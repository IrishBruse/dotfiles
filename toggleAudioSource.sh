tv="alsa_output.pci-0000_01_00.1.hdmi-stereo"
headset="alsa_output.usb-Logitech_G533_Gaming_Headset-00.analog-stereo"


if [ "$(pactl get-default-sink)" = "$headset" ]
then
    pactl set-default-sink "$tv"
else
    pactl set-default-sink "$headset"
fi
