#!/usr/bin/env bash
# Install SDDM greeter fixes for Linux Mint Cinnamon (Wayland session picker).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDDM_DIR="${SCRIPT_DIR}/sddm"

usage() {
    cat <<'EOF'
install-sddm.sh - SDDM greeter layout and plasma-chili click fixes

Usage:
  sudo install-sddm.sh

Installs:
  - /usr/share/sddm/scripts/Xsetup (single-monitor greeter)
  - /etc/sddm.conf and /etc/sddm.conf.d/*
  - plasma-chili theme fixes (session picker clicks, battery widget)

Requires: sddm, plasma-framework, plasma-chili theme in /usr/share/sddm/themes/

Re-run after sddm or plasma-chili theme package upgrades if files are overwritten.
EOF
}

die() {
    echo "install-sddm.sh: $*" >&2
    exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
    die "run with sudo: sudo $0"
fi

[[ -f "${SDDM_DIR}/Xsetup" ]] || die "missing ${SDDM_DIR}/Xsetup"
[[ -f "${SDDM_DIR}/sddm.conf" ]] || die "missing ${SDDM_DIR}/sddm.conf"
[[ -f "${SDDM_DIR}/plasma-chili/Main.qml" ]] || die "missing ${SDDM_DIR}/plasma-chili/Main.qml"
[[ -f "${SDDM_DIR}/plasma-chili/theme.conf" ]] || die "missing ${SDDM_DIR}/plasma-chili/theme.conf"
[[ -f "${SDDM_DIR}/plasma-chili/components/Battery.qml" ]] || die "missing ${SDDM_DIR}/plasma-chili/components/Battery.qml"

install -D -m 0755 "${SDDM_DIR}/Xsetup" /usr/share/sddm/scripts/Xsetup
install -D -m 0644 "${SDDM_DIR}/sddm.conf" /etc/sddm.conf

if [[ -d "${SDDM_DIR}/sddm.conf.d" ]]; then
    install -d -m 0755 /etc/sddm.conf.d
    for conf in "${SDDM_DIR}"/sddm.conf.d/*.conf; do
        [[ -f "$conf" ]] || continue
        install -m 0644 "$conf" "/etc/sddm.conf.d/$(basename "$conf")"
    done
fi

THEME_DIR="/usr/share/sddm/themes/plasma-chili"
[[ -d "$THEME_DIR" ]] || die "plasma-chili SDDM theme not installed: $THEME_DIR"

install -m 0644 "${SDDM_DIR}/plasma-chili/theme.conf" "${THEME_DIR}/theme.conf"
install -m 0644 "${SDDM_DIR}/plasma-chili/Main.qml" "${THEME_DIR}/Main.qml"
install -D -m 0644 "${SDDM_DIR}/plasma-chili/components/Battery.qml" "${THEME_DIR}/components/Battery.qml"

echo "Installed SDDM greeter fixes."
echo "Log out to verify the plasma-chili login screen loads."
