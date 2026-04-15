---
name: ask
description: >-
  Documents the global `ask` CLI command used for getting user feedback during a
  session rather than having to stop.
---

# `ask` (global CLI)

## Purpose

**`ask`** is the on-**`PATH`** command for a **blocking GUI dialog**: a question plus a single-line text field. On success the answer is printed so the caller can read it.

Use it when a script or automation needs **typed input** without a TTY menu and a native dialog is acceptable.

## Command-line interface

- **Usage**: `ask "<question>"` — all arguments after `ask` form one question string.
- **Output**: the submitted text when the user completes the dialog successfully.

### Exit codes

| Code | Meaning                                                                      |
| ---- | ---------------------------------------------------------------------------- |
| `0`  | Success; read the answer from the command output.                            |
| `1`  | Cancelled, error, unsupported environment, or missing dependencies on Linux. |
| `2`  | No question given.                                                           |

## Using `ask` from agents and scripts

1. Call **`ask "…"`** when it is available.
2. **Requires a GUI** — not appropriate for typical CI, remote shells without a display, or sandboxes unless a display is known to work.
3. **Blocking** — waits for the user; allow enough time under automation.
4. **Quoting** — pass the whole question as one shell argument when it contains spaces or shell metacharacters.
