tv="alsa_output.pci-0000_01_00.1.hdmi-stereo-extra1"
headset="alsa_output.usb-Logitech_G533_Gaming_Headset-00.iec958-stereo"

CURRENT_PROFILE=$(pacmd list-cards | grep "active profile" | cut -d ' ' -f 3-)

if [ "$CURRENT_PROFILE" = "<output:hdmi-stereo>" ]; then
        pacmd set-card-profile 0 "output:analog-stereo+input:analog-stereo"
        disper -s
else
        pacmd set-card-profile 0 "output:hdmi-stereo"
        disper -S
fi
