# Linux Mint health review (since install, ~534 days)

Your system was installed **2025-01-21** (Linux Mint 22.3 Cinnamon). That lines up with 534 days ago. APT/dpkg logs cover the full period, but **systemd journal only goes back to ~2026-06-10**, so recent-session detail is solid, older recurring errors are inferred from logs and package history.

**Overall:** Package management is healthy (no broken packages, `apt-get check` clean). Disks are fine (SMART passed). The main problems are **disk space pressure**, **Hyprland services fighting Cinnamon**, and **running an unsupported mainline kernel** instead of Mint's HWE stack.

---

## Critical

### 1. `/home` is 95% full (20 GB free)

This can cause failed writes, broken updates, and app crashes.

| Location | Size | Notes |
|----------|------|-------|
| `~/.local/share/Trash` | **8.1 GB** | Easy win |
| `~/.cache/huggingface` | 12 GB | ML datasets/models |
| `~/.cache/pip` | 10 GB | Pip HTTP cache |
| `~/.cache/openwhispr` | 5.3 GB | Voice models |
| `~/.local/share/Steam` + Lutris | 28 GB | Expected for gaming |

**Suggested actions:**

```bash
# Empty trash
gio trash --empty

# Safe cache trims (review first if unsure)
pip cache purge
rm -rf ~/.cache/ms-playwright ~/.cache/puppeteer
```

---

### 2. Hyprland services enabled on a Cinnamon session (active breakage)

You run **Cinnamon 6.7.4 on Wayland**, but these user services are **enabled** and **fail every login**:

| Service | Problem |
|---------|---------|
| `hypridle.service` | SIGABRT crash loop (needs Hyprland compositor) |
| `swaync.service` | Fails to own `org.freedesktop.Notifications` (Cinnamon already has it) |
| `hyprpolkitagent.service` | Also crashing at login |

Installed **2026-01-06** with the Hyprland PPA stack. Cinnamon's idle monitor then logs repeated `Failed to acquire idle monitor proxy: Timeout was reached` in `~/.xsession-errors`, likely tied to this conflict.

**Fix (if you're staying on Cinnamon):**

```bash
systemctl --user disable --now hypridle swaync hyprpolkitagent
```

If you dual-boot Hyprland vs Cinnamon, enable these only inside Hyprland (e.g. Hyprland exec-once), not globally.

---

### 3. Booting mainline kernel 6.18 instead of Mint HWE 7.0

| Kernel | Status |
|--------|--------|
| `6.18.18-061818-generic` | **Currently running** (mainline PPA, installed 2026-03-18) |
| `7.0.0-14-generic` | Installed 2026-05-31, **not default** |
| `6.19.10-061910-generic` | Also installed |

Mainline kernels are not tested with Mint's graphics stack. You're seeing:

- **Intel Arc B580 `xe` driver:** repeated `PCODE Mailbox failed` and `Failed to read power limits` at boot
- **SDDM greeter SIGSEGV** today in `plasma-chili` theme (Qt5 QML crash at login)

**Recommended:** Boot into **7.0.0-14-generic** (Advanced options in GRUB), confirm stability, then set it as default in GRUB Customizer or:

```bash
# After confirming 7.0 works well
sudo apt purge 'linux-image-unsigned-6.*' 'linux-headers-6.*'
sudo update-grub
```

---

## High

### 4. `casper` live-ISO package still installed (fails every boot)

Left over from the Jan 2025 install. `casper-md5check.service` fails 34+ times in the journal because `/cdrom` does not exist on an installed system.

```bash
sudo apt purge casper
sudo systemctl disable casper-md5check.service
```

---

### 5. SDDM login theme crash (`plasma-chili`)

Today's `sddm-greeter` segfault is in Qt5 QML under the `plasma-chili` theme (`/etc/sddm.conf` sets `Current=plasma-chili`). Mint's default `maya` or `sugar-candy` is safer:

```bash
sudo sed -i 's/Current=plasma-chili/Current=maya/' /etc/sddm.conf
```

---

### 6. Broken Hytale Flatpak remote breaks Mint Update cache refresh

`hytalelauncher-origin` in `/var/lib/flatpak/repo/config` has an **empty URL**. That triggers `mint-refresh-cache could not update the cache` in session logs.

Options:

- Remove the remote if you don't need live updates: `sudo flatpak remote-delete --system hytalelauncher-origin`
- Or fix the URL if you have a valid repo endpoint for the launcher

---

### 7. IBus duplicate service registration

At login: `Two services allocated for the same bus name org.freedesktop.IBus`. Both `org.freedesktop.IBus.session.GNOME.service` and the generic IBus unit are enabled. IBus works now, but this can cause input-method flakiness.

```bash
systemctl --user disable org.freedesktop.IBus.session.GNOME.service
# Keep ibus-daemon via Cinnamon's normal startup
```

---

## Medium

### 8. Intel Arc B580 GPU firmware/driver warnings

`xe` driver PCODE mailbox errors at every boot on kernel 6.18. Often improves on the HWE 7.0 kernel with matching `linux-firmware`. If they persist on 7.0, check for BIOS/GOP updates for the Arc B580.

### 9. Xbox wireless dongle (`xone`) init failure

`xone_dongle_fw_load: init radio failed: -71` at boot. USB/power or firmware issue on the dongle, not a general OS regression.

### 10. Pending security updates

8 packages waiting, including **curl** (security). Run Update Manager or:

```bash
sudo apt upgrade
```

### 11. PPAs and complexity creep

You have **10+ third-party APT sources** (Hyprland, Kisak Mesa, Intel graphics, GCC 16, OBS, etc.). Not broken today, but increases the chance of future dependency conflicts on Mint. Worth auditing anything you no longer use.

### 12. Orphaned config from removed desktops

`rc` state packages remain from KDE Plasma, GDM, PulseAudio, etc. Harmless but noisy. `sudo apt purge $(dpkg -l | awk '/^rc/{print $2}')` cleans them up.

---

## Low / informational

- **NVMe SMART:** both drives PASSED
- **Root partition:** 32% used (fine)
- **RAM/swap:** healthy (31 GB RAM, swap unused)
- **Secure Boot:** disabled (fine for custom kernels/drivers)
- **Flatpak:** 6 pending updates, duplicate `flathub` remote (system + user)
- **Journal retention:** ~1 month only, limits long-term forensics

---

## Timeline of introduced issues

| When | What |
|------|------|
| **2025-01-21** | Fresh Mint 22.3 install, `casper` left behind |
| **2025-07 to 2025-08** | Mainline kernel experimentation begins |
| **2026-01-06** | Hyprland stack installed on Cinnamon system (root of current service crashes) |
| **2026-01-26** | `plasma-chili` SDDM theme added |
| **2026-03-18** | Kernel 6.18.18 installed, became default boot |
| **2026-05-31** | Mint HWE 7.0 kernel installed but not selected as default |
| **Today** | Multiple login-time crashes (hypridle, swaync, hyprpolkitagent, sddm-greeter) |

---

## Recommended priority order

1. **Free `/home` space** (trash + caches) -- prevents cascading failures
2. **Disable Hyprland user services** on Cinnamon
3. **Boot and pin HWE 7.0 kernel**, remove mainline kernels once stable
4. **Purge `casper`**, switch SDDM theme to `maya`
5. **Fix or remove `hytalelauncher-origin` Flatpak remote**
6. **Apply pending security updates**
