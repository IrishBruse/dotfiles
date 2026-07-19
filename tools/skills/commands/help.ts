import process from "node:process";

export function printHelp(): void {
  process.stderr.write(`skills - lint agent skill markdown

Usage:
  skills lint [path...]

Commands:
  lint     Check skill markdown for style issues (global.mdc, writing-great-skills)

With no paths, lint scans ~/.agents/skills, ~/.cursor/skills, and
~/.cursor/skills-cursor for .md and .mdc files.

Options:
  -h, --help   Show help

Exit code 1 when warnings are found. Diagnostics use compiler-style
`file:line:column - warning code: message` on stderr.
`);
}
