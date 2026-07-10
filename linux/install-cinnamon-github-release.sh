#!/usr/bin/env bash
# Install the Cinnamon desktop stack from Linux Mint GitHub release archives.
# Replicates the flow used to upgrade to Cinnamon 6.7.x on Mint 22.
set -euo pipefail

usage() {
    cat <<'EOF'
install-cinnamon-github-release.sh - install Cinnamon from GitHub release archives

Usage:
  install-cinnamon-github-release.sh [options]

Options:
  --tag TAG         Release tag to install (default: master.mint<N> from /etc/linuxmint/info)
  --work-dir DIR    Download and extract packages here (default: temp dir)
  --keep-work-dir   Do not delete the work dir on success
  --with-dbg        Install all -dbg packages from the archives (default: upgrade only installed -dbg)
  --download-only   Download archives only, do not install
  --sudo            Use sudo instead of pkexec for privileged commands
  -h, --help        Show this help

Requires: curl, tar, dpkg, pkexec or sudo, and network access to github.com.
EOF
}

die() {
    echo "install-cinnamon-github-release.sh: $*" >&2
    exit 1
}

run_privileged() {
    if [[ "$USE_SUDO" == "1" ]]; then
        sudo "$@"
    else
        pkexec "$@"
    fi
}

default_release_tag() {
    if [[ -r /etc/linuxmint/info ]]; then
        local release
        release=$(sed -n 's/^RELEASE=//p' /etc/linuxmint/info | head -1)
        if [[ "$release" =~ ^([0-9]+) ]]; then
            echo "master.mint${BASH_REMATCH[1]}"
            return
        fi
    fi
    echo "master.mint22"
}

REPOS=(
    cinnamon-desktop
    cjs
    muffin
    cinnamon-session
    cinnamon-settings-daemon
    cinnamon-screensaver
    cinnamon
)

# Bottom-up install order from the 6.7 stack upgrade.
INSTALL_PATTERNS=(
    cinnamon-desktop/packages/cinnamon-desktop-data_*.deb
    cinnamon-desktop/packages/libcinnamon-desktop4_*.deb
    cinnamon-desktop/packages/libcvc0_*.deb
    cinnamon-desktop/packages/gir1.2-cinnamondesktop-3.0_*.deb
    cinnamon-desktop/packages/gir1.2-cvc-1.0_*.deb
    cjs/packages/libcjs0_*.deb
    cjs/packages/cjs_*.deb
    muffin/packages/muffin-common_*.deb
    muffin/packages/libmuffin0_*.deb
    muffin/packages/gir1.2-meta-muffin-0.0_*.deb
    muffin/packages/muffin_*.deb
    cinnamon-session/packages/cinnamon-session-common_*.deb
    cinnamon-session/packages/cinnamon-session_*.deb
    cinnamon-settings-daemon/packages/cinnamon-settings-daemon_*.deb
    cinnamon-screensaver/packages/cinnamon-screensaver_*.deb
    cinnamon/packages/cinnamon-common_*.deb
    cinnamon/packages/cinnamon_*.deb
)

DBG_PATTERNS=(
    cinnamon-desktop/packages/libcinnamon-desktop-dbg_*.deb
    cinnamon-desktop/packages/libcvc-dbg_*.deb
    cjs/packages/libcjs-dbg_*.deb
    muffin/packages/muffin-dbg_*.deb
    cinnamon-settings-daemon/packages/cinnamon-settings-daemon-dbg_*.deb
    cinnamon-screensaver/packages/libcscreensaver-dbg_*.deb
    cinnamon/packages/cinnamon-dbg_*.deb
)

TAG=""
WORK_DIR=""
KEEP_WORK_DIR=0
WITH_DBG=0
DOWNLOAD_ONLY=0
USE_SUDO=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag)
            [[ $# -ge 2 ]] || die "--tag requires a value"
            TAG="$2"
            shift 2
            ;;
        --work-dir)
            [[ $# -ge 2 ]] || die "--work-dir requires a value"
            WORK_DIR="$2"
            shift 2
            ;;
        --keep-work-dir) KEEP_WORK_DIR=1; shift ;;
        --with-dbg) WITH_DBG=1; shift ;;
        --download-only) DOWNLOAD_ONLY=1; shift ;;
        --sudo) USE_SUDO=1; shift ;;
        -h|--help) usage; exit 0 ;;
        *) die "unknown argument: $1 (use --help)" ;;
    esac
done

command -v curl >/dev/null || die "curl is required"
command -v tar >/dev/null || die "tar is required"
command -v dpkg >/dev/null || die "dpkg is required"

if [[ "$USE_SUDO" == "1" ]]; then
    command -v sudo >/dev/null || die "sudo is required with --sudo"
else
    command -v pkexec >/dev/null || die "pkexec is required (or pass --sudo)"
fi

[[ -n "$TAG" ]] || TAG="$(default_release_tag)"

CREATED_WORK_DIR=0
if [[ -z "$WORK_DIR" ]]; then
    WORK_DIR="$(mktemp -d /tmp/cinnamon-github-release.XXXXXX)"
    CREATED_WORK_DIR=1
else
    mkdir -p "$WORK_DIR"
fi

cleanup() {
    if [[ "$CREATED_WORK_DIR" == "1" && "$KEEP_WORK_DIR" != "1" ]]; then
        rm -rf "$WORK_DIR"
    fi
}
trap cleanup EXIT

resolve_debs() {
    local -n _patterns=$1
    local pattern path
    local -a resolved=()

    for pattern in "${_patterns[@]}"; do
        shopt -s nullglob
        local matches=("$WORK_DIR"/$pattern)
        shopt -u nullglob
        if [[ ${#matches[@]} -eq 0 ]]; then
            die "missing package for pattern: $pattern"
        fi
        if [[ ${#matches[@]} -gt 1 ]]; then
            die "multiple packages match pattern: $pattern"
        fi
        resolved+=("${matches[0]}")
    done

    printf '%s\n' "${resolved[@]}"
}

download_archives() {
    local repo url dest
    for repo in "${REPOS[@]}"; do
        dest="$WORK_DIR/$repo"
        mkdir -p "$dest"
        url="https://github.com/linuxmint/$repo/releases/download/$TAG/packages.tar.gz"
        echo "Downloading $repo ($TAG) ..."
        curl -fsSL -o "$dest/packages.tar.gz" "$url"
        tar -xzf "$dest/packages.tar.gz" -C "$dest"
        rm -f "$dest/packages.tar.gz"
    done
}

remove_stale_local_muffin() {
    local libdir=/usr/local/lib/x86_64-linux-gnu
    if [[ -e "$libdir/libmuffin.so.0" || -d "$libdir/muffin" ]]; then
        echo "Removing stale /usr/local muffin libraries ..."
        run_privileged rm -f "$libdir"/libmuffin.so*
        run_privileged rm -rf "$libdir/muffin"
        run_privileged ldconfig
    fi
}

dbg_debs_to_install() {
    local -a dbg_debs=()
    local pattern deb pkg

    for pattern in "${DBG_PATTERNS[@]}"; do
        shopt -s nullglob
        local matches=("$WORK_DIR"/$pattern)
        shopt -u nullglob
        if [[ ${#matches[@]} -ne 1 ]]; then
            continue
        fi
        deb="${matches[0]}"
        pkg="$(dpkg-deb -f "$deb" Package)"
        if [[ "$WITH_DBG" == "1" ]] || dpkg -s "$pkg" >/dev/null 2>&1; then
            dbg_debs+=("$deb")
        fi
    done

    printf '%s\n' "${dbg_debs[@]}"
}

install_debs() {
    local -a debs=()
    mapfile -t debs < <(resolve_debs INSTALL_PATTERNS)

    echo "Installing ${#debs[@]} packages with $( [[ "$USE_SUDO" == "1" ]] && echo sudo || echo pkexec ) ..."
    run_privileged dpkg -i "${debs[@]}"

    local -a dbg_debs=()
    mapfile -t dbg_debs < <(dbg_debs_to_install)
    if [[ ${#dbg_debs[@]} -gt 0 ]]; then
        echo "Installing ${#dbg_debs[@]} debug packages ..."
        run_privileged dpkg -i "${dbg_debs[@]}"
    fi

    run_privileged apt-get check
}

verify_install() {
    echo "Verifying install ..."
    gsettings get org.cinnamon.desktop.wm.preferences prevent-focus-stealing >/dev/null \
        || die 'missing GSettings key "prevent-focus-stealing" (cinnamon-desktop schemas may be mismatched)'
    cinnamon --version
    echo "Installed Cinnamon stack from tag $TAG."
    echo "Log out and back in, or run: cinnamon --replace &"
}

echo "Release tag: $TAG"
echo "Work dir: $WORK_DIR"

download_archives

if [[ "$DOWNLOAD_ONLY" == "1" ]]; then
  echo "Download complete. Packages are in $WORK_DIR"
  KEEP_WORK_DIR=1
  exit 0
fi

install_debs
remove_stale_local_muffin
verify_install
