import process from "node:process";

export function printHelp(): void {
  process.stderr.write(`skills - lint and list agent skills

Usage:
  skills <command>

Commands:
  ls       List skills from global and project locations
  lint     Check skill markdown for style issues (global.mdc, writing-great-skills)

skills ls scans ~/.agents/skills, ~/.cursor/skills, ~/.cursor/skills-cursor,
and the same paths under the current directory and its parents.

With no paths, skills lint scans ~/.agents/skills and ~/.cursor/skills for .md
and .mdc files. It does not scan ~/.cursor/skills-cursor.

Lint options:
  --fix        Apply safe auto-fixes, then report remaining warnings

Options:
  -h, --help   Show help

Exit code 1 when lint finds warnings or ls finds no skills. Lint diagnostics
use compiler-style \`file:line:column - warning code: message\` on stderr.
`);
}
