#!/usr/bin/env bash
# Install the SDDM Xsetup script for single-monitor greeter layout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${SCRIPT_DIR}/sddm/Xsetup"
TARGET="/usr/share/sddm/scripts/Xsetup"

usage() {
    cat <<'EOF'
install-sddm-xsetup.sh - show SDDM only on the main display

Usage:
  sudo install-sddm-xsetup.sh

Installs linux/sddm/Xsetup to /usr/share/sddm/scripts/Xsetup.
Re-run after sddm package upgrades if the file is overwritten.
EOF
}

die() {
    echo "install-sddm-xsetup.sh: $*" >&2
    exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
    die "run with sudo: sudo $0"
fi

[[ -f "$SOURCE" ]] || die "missing source file: $SOURCE"

install -D -m 0755 "$SOURCE" "$TARGET"
echo "Installed $TARGET"
echo "Log out or reboot to verify the SDDM layout."
