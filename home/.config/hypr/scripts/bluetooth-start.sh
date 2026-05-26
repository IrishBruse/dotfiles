#!/bin/bash

JABRA_MAC="50:C2:75:22:31:3D"

bluetoothctl power on
bluetoothctl connect "$JABRA_MAC" 2>/dev/null || true
