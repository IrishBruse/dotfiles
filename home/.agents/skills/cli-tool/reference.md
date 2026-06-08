# CLI Tool - Reference

Implementation patterns referenced from the skill.

## Bin stub

`.bin/<name>.js` at the package root:

```javascript
#!/usr/bin/env node
import "../<folder>/main.ts";
```

When the bin name differs from the folder, point at the folder (e.g. `cmd` imports `../command-folder/main.ts`).

## package.json bin entry

In the package `package.json`:

```json
"<name>": "./.bin/<name>.js"
```

## Simple single-purpose CLI

```typescript
function parseFlags(args: string[]): {
  flags: Record<string, string | boolean>;
  positional: string[];
} {
  // see Flag parsing below
}

const { flags, positional } = parseFlags(process.argv.slice(2));
if (flags.help || positional.length === 0) {
  printHelp();
  process.exit(0);
}
```

## Subcommand CLI

```typescript
export function main(argv: string[]): void {
  const [cmd, ...rest] = argv.slice(2);
  switch (cmd) {
    case "foo":
      return runFoo(rest);
    case "bar":
      return runBar(rest);
    default:
      console.error(`mytool: unknown command "${cmd}"`);
      printHelp();
      process.exitCode = 1;
  }
}
main(process.argv);
```

## Async main

```typescript
async function main(argv: string[]): Promise<void> {
  // ...
}
main(process.argv).catch((err) => {
  console.error(`mytool: ${(err as Error).message}`);
  process.exit(1);
});
```

## Flag parsing (no library)

```typescript
function parseFlags(args: string[]): {
  flags: Record<string, string | boolean>;
  positional: string[];
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        flags[arg.slice(2)] = args[i + 1]?.startsWith("-")
          ? true
          : (args[++i] ?? true);
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}
```

Accept both `--flag value` and `--flag=value`. Treat bare `--flag` as boolean true.

## Stdin or file input

```typescript
async function readInput(filePath?: string): Promise<string> {
  if (filePath) return fs.readFile(filePath, "utf8");
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8");
  }
  console.error("mytool: provide a file path or pipe input");
  process.exit(1);
}
```

## Help template

```
<name> - one-line description

Usage:
  <name> <subcommand> [args]
  <name> [options]

Commands:
  foo   What foo does
  bar   What bar does

Options:
  --flag <value>   Description
  -h, --help       This message
```

## TTY-gated paint helper

```typescript
const RESET = "\x1b[0m";

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") return text;
  return `${code}${text}${RESET}`;
}
```

Pass `process.stdout.isTTY === true` (or stderr for errors) as the enabled flag.

## Semantic ANSI constants

```typescript
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";
const CYAN  = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED   = "\x1b[31m";
const INVERT = "\x1b[7m";
```

Usage examples:

- `paint(color, RED, "mytool: missing arg")` on stderr
- `paint(color, YELLOW, ">")` for in-progress tool calls
- `paint(color, GREEN, "ok")` or `paint(color, RED, "fail")` for outcomes
- `paint(color, CYAN, "*")` plus `paint(color, BOLD, name)` for headers
- `paint(color, DIM, detail)` for secondary text
- `INVERT + line + RESET` for TUI selection rows

## True color from hex

```typescript
function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fg(hex: string): string {
  const [r, g, b] = rgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bg(hex: string): string {
  const [r, g, b] = rgb(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
}

export const reset = "\x1b[0m";
export const bold = "\x1b[1m";
export const italic = "\x1b[3m";
```

Use for markdown renderers and themed UIs. Pair fg with bg for code blocks. Reset after each styled span.

## Strip ANSI for width

```typescript
const ANSI_RE = /\u001b\[[0-9;]*m/g;

function visibleLength(s: string): number {
  return s.replace(ANSI_RE, "").length;
}
```

Required when padding columns or clipping text in interactive UIs.

## Validation

From the package root:

```bash
npm run validate    # tsc --noEmit
npm run verify      # validate + lint + format:check
```

Common tsc errors:

- Missing `.ts` extension on a relative import - add it
- `Cannot find module` for a new file - check path and that the file exists
- Type errors in argv slices - cast or guard explicitly
