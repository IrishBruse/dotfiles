#!/usr/bin/env bash
# Back-compat wrapper. Use install-sddm.sh for the full greeter setup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/install-sddm.sh" "$@"
