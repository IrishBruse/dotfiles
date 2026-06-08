---
name: cli-tool
description: >
  How Ethan builds CLI tools in his Node/TypeScript monorepo. Consult this before
  creating any new command, subcommand, or bin stub - and whenever working on argv
  parsing, flag handling, help text, stdin/pipe input, exit codes, error messaging,
  or terminal colors. Also use when wiring package.json "bin" entries, structuring
  a multi-action tool,
  or running validate/verify. Mirror an existing command in the same package before
  inventing structure.
---

# CLI Tool

For code snippets and templates, see [reference.md](reference.md).

## Package layout

All CLIs live under `tools/` as one Node package (`tools/package.json`, `tools/tsconfig.json`).

- One folder per CLI under `tools/<folder>/`
- Bin stubs in `tools/.bin/` import that folder's main entry
- Register each command in the package `bin` map (`tools/package.json`)
- Bin name may differ from folder name (e.g. `md` -> `tools/markdown/`)

## Runtime

- TypeScript run directly with Node 24 via strip-types. Linked bins rely on this automatically
- ESM only: module type set to ESM, nodenext resolution, TypeScript extensions on all relative imports
- Use the node protocol prefix for builtins
- No build step - typecheck only with no emit
- Do not use environment variables unless explicitly asked

## main.ts patterns

Keep the main entry thin: parse argv, dispatch, print help. Put logic in sibling modules.

**Simple single-purpose CLI** - parse argv inline, handle help flags, exit on bad input. Good for calculators, formatters, one-shot transforms.

**Subcommand CLI** - first arg is the command, dispatch into a commands directory. Unknown command prints help and sets a non-zero exit code. Good for multi-action tools.

Export a main function that accepts argv when the entry may be imported for tests or reuse, then invoke it with process argv at the bottom.

**Async main** - use an async entry wrapped in a top-level catch. Never let async errors go unhandled.

**Flag parsing** - no library. Parse manually from an argv slice. Accept both spaced and equals forms for long flags. Treat a bare long flag as boolean true.

**Stdin reading** - check whether stdin is a TTY. Accept a file path as an alternative to piped input.

### Help format

One-line description, Usage block, Commands or Options section, and help flags documented. Print help on help flags. When invoked with no args, print help rather than an error if that matches sibling commands. See reference.md for the template.

## Terminal colors

Color is opt-in per stream. Gate on TTY: check stdout TTY for rendered output, stderr TTY for errors and status.

- Use a paint helper that takes an enabled flag and returns plain text when color is off or the string is empty
- Always reset after a colored span. Never leave the terminal styled
- Pipe-friendly tools keep primary stdout plain. Only color when the command is a renderer or interactive UI

**Semantic palette** (basic 8-color ANSI):

| Role | Color | Use |
| --- | --- | --- |
| Error | red | stderr messages, failed operations |
| Success | green | completed steps, ok outcomes |
| In progress | yellow | running tool calls, warnings |
| Label | cyan | model names, section markers |
| Secondary | dim | thinking state, summaries, help hints |
| Emphasis | bold | names, headings in status rows |

**Rich output** (markdown renderers, themed UIs): use 24-bit true color from hex values. Provide fg and bg helpers that emit 38;2 and 48;2 sequences. Align palette with the editor theme when the tool renders markdown or code.

**Interactive UIs**: invert for selection, dim for keybinding hints, 24-bit grays for inactive vs active tabs. Strip ANSI when measuring visible string width.

See reference.md for paint helpers, error coloring, and true-color utilities.

## Errors and exit codes

- Prefix errors with the command name and subcommand when relevant
- Color errors red on stderr when stderr is a TTY
- User-facing messages go to stderr. Primary output goes to stdout
- Hard failures at top level use immediate exit with code 1
- Catch handlers and subcommand dispatchers set exit code 1 instead
- Subcommand run functions may return a numeric exit code. Main exits with that code when non-zero
- Unexpected args: error listing the leftover tokens, then exit 1

## File organization inside a command

| File / dir | Role |
| --- | --- |
| `main.ts` | argv, help, dispatch |
| `commands/` (flat file) | Simple subcommand that fits in one file |
| `commands/<name>/` | Complex subcommand with its own helper files |
| `commands/help.ts` | Shared help text for multi-action tools |
| `types.ts` | Shared interfaces for this command |
| `errors.ts` | Custom error classes or formatting helpers |
| `CONFIG.ts` | Read-only configuration constants loaded at startup |
| Sibling modules | Domain logic split by concern |
| `autocomplete.fish` | Optional fish shell completions |

**Choosing between subcommand styles:**

- Flat file under commands - subcommand fits in one file with no internal helpers
- Folder under commands - subcommand is complex enough to warrant sibling modules
- No commands directory - when all files share a domain model and sit as direct siblings of main

**Prompt-driven commands:** load named markdown templates from a config directory (e.g. `interpolate` + `~/.config/interpolate/*.md`). Never hardcode prompts in source.

**Top-level scripts:** some CLIs run at module scope with no `main()` export (`endpoint`, `sprint`, `md`). Use that only when the entry is a single linear flow.

## Validation

From `tools/`: `npm run validate` (typecheck). `npm run verify` adds lint and format checks. See reference.md for commands and common typecheck failures.

## Avoid

- CommonJS require - ESM only
- Logging errors to stdout - use stderr so pipes stay clean
- Coloring stdout on filter or pipe tools - breaks downstream consumers
- Raw ANSI without reset or TTY checks
- Relative imports without a TypeScript extension - strip-types requires it
- Calling exit from library or domain modules - only from main or top-level handlers
- Hardcoding prompts in source
- Environment variables unless the user explicitly asks for them

## Command archetypes

Pick the closest and match its argv style, help format, and error tone.

| Archetype | Shape | When to use |
| --- | --- | --- |
| **Minimal** | args only, no subcommands | Single transformation or lookup |
| **Filter** | stdin or file arg, stdout result | Render, convert, or pipe-process data |
| **Server** | flags + long-running process | Local HTTP listener, watcher, daemon |
| **Multi-action** | subcommand + args | Several related operations under one name |
| **Composable** | multi-action + shared internal modules | Orchestration across reusable libraries |
| **Async** | async main with top-level catch | Subcommands that await I/O or subprocesses |

## Checklist

Use before finishing any new CLI, subcommand, or meaningful change to an existing command.

### New command

- [ ] Pick the closest archetype and mirror argv style, help format, and error tone from a sibling in `tools/`
- [ ] `tools/<folder>/main.ts` - thin entry: parse argv, dispatch, print help
- [ ] `tools/.bin/<name>.js` stub (`#!/usr/bin/env node`, imports `../<folder>/main.ts`)
- [ ] `bin` entry in `tools/package.json` (note if bin name differs from folder, e.g. `md` -> `markdown`)
- [ ] `npm link` from `tools/` when the command should be on PATH

### Every change

- [ ] ESM only: `.ts` extensions on relative imports, `node:` prefix for builtins
- [ ] Help: one-line description, Usage, Commands or Options, `-h`/`--help` documented
- [ ] No-args behavior matches sibling commands (help vs error)
- [ ] Errors prefixed with command (and subcommand when relevant), written to stderr
- [ ] Primary output on stdout only - pipe-friendly unless the tool is a renderer or TUI
- [ ] Exit code 1 on failure (`process.exit(1)` or `process.exitCode = 1`)
- [ ] Async entry wrapped in top-level `.catch()` - no unhandled rejections
- [ ] Colors gated on TTY (`stdout` for output, `stderr` for errors/status)
- [ ] No `process.exit` in library or domain modules - only main or top-level handlers
- [ ] No new env vars unless the user explicitly asked
- [ ] No hardcoded prompts - load from config dir or use `interpolate`
- [ ] `npm run validate` from `tools/` passes
- [ ] Run `npm run verify` when you touched lint/format-sensitive code
