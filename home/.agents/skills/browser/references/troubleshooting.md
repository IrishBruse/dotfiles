# Troubleshooting

Install diagnosis and runtime fixes for agent-browser workflows.

## Diagnosing install issues

If a command fails unexpectedly (`Unknown command`, `Failed to connect`, stale daemons, version mismatches after `upgrade`,
missing Chrome, etc.) run `doctor` before anything else:

```bash
agent-browser doctor                     # full diagnosis (env, Chrome, daemons, config, providers, network, launch test)
agent-browser doctor --offline --quick   # fast, local-only
agent-browser doctor --fix               # also run destructive repairs (reinstall Chrome, purge old state, ...)
agent-browser doctor --json              # structured output for programmatic consumption
```

`doctor` auto-cleans stale socket/pid/version sidecar files on every run. Destructive actions require `--fix`.
Exit code is `0` if all checks pass (warnings OK), `1` if any fail.

## Runtime issues

**"Ref not found" / "Element not found: @eN"** Page changed since the snapshot. Run `agent-browser snapshot -i` again, then use the new refs.

**Element exists in the DOM but not in the snapshot** It's probably off-screen or not yet rendered. Try:

```bash
agent-browser scroll down 1000
agent-browser snapshot -i
# or
agent-browser wait --text "..."
agent-browser snapshot -i
```

**Click does nothing / overlay swallows the click** Some modals and cookie banners block other clicks.
If `click` reports `covered by <...>`, interact with that covering element first.
Otherwise, snapshot, find the dismiss/close button, click it, then re-snapshot.

**Fill / type doesn't work** Some custom input components intercept key events. Try:

```bash
agent-browser focus @e1
agent-browser keyboard inserttext "text"    # bypasses key events
# or
agent-browser keyboard type "text"          # raw keystrokes, no selector
```

**Page needs JS you can't get right in one shot** Use `eval --stdin` with a heredoc instead of inline:

```bash
cat <<'EOF' | agent-browser eval --stdin
// Complex script with quotes, backticks, whatever
document.querySelectorAll('[data-id]').length
EOF
```

**Cross-origin iframe not accessible** Cross-origin iframes that block accessibility tree access are silently skipped.
Use `frame "#iframe"` to switch into them explicitly if the parent opts in,
otherwise the iframe's contents aren't available via snapshot - fall back to `eval` in the iframe's origin or use the `--headers` flag to satisfy CORS.

**WebGPU page renders black in screenshots** Headless Chrome doesn't expose WebGPU by default,
three.js `WebGPURenderer` then silently falls back or renders nothing.
Relaunch with the `--webgpu` flag, wait for the app's first rendered frame, then screenshot.
On Linux install `libvulkan1 mesa-vulkan-drivers` first.
If it's still black on Windows/Linux, that's an upstream headless-capture limitation:
add `--headed` (needs a logged-in desktop on Windows, on Linux agent-browser starts a private virtual display automatically when Xvfb is installed -
never wrap in `xvfb-run`, which kills the display when the CLI exits while the browser lives on).
Verify with `agent-browser doctor --webgpu`. See `references/webgpu.md`.

**Authentication expires mid-workflow** Use `--session <id> --restore` so your session survives browser restarts.
Check `agent-browser session info --json` if restore fails.
See `references/session-management.md` and `references/authentication.md`.
