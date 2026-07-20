import process from "node:process";

export function printHelp(): void {
  process.stderr.write(`skills - lint and list agent skills

Usage:
  skills <command>

Commands:
  ls       List skills from global and project locations
  lint     Check skill markdown against tools/skills/rules

skills ls scans standard agent skill roots under ~ (for example ~/.agents/skills,
~/.cursor/skills, ~/.claude/skills, ~/.config/opencode/skills) and skills.sh-
compatible project paths under the current directory and its parents.
~/.cursor/skills-cursor is omitted unless you pass --cursor-builtin.

With no paths, skills lint scans the same skill roots for .md and .mdc
files. With a path, lint scopes to that skill folder: a SKILL.md file lints
every markdown file in its directory, and a directory path lints that tree.

Shared options:
  --cursor-builtin   Include ~/.cursor/skills-cursor and project skills-cursor

Lint options:
  --fix              Apply safe auto-fixes, then report remaining warnings
                     (typical: skills lint path/to/SKILL.md --fix)
                     Auto-fixes: block-scalar descriptions, orphan frontmatter
                     lines, nested reference links, reference TOCs, long prose
                     lines, prose semicolons, and non-ASCII

Options:
  -h, --help   Show help

Exit code 1 when lint finds warnings or ls finds no skills. Lint diagnostics
use ESLint-style output on stderr: file path, then indented
\`line:col  severity  message  @skills/rule-id\` lines. Auto-fixable rules
append \`(fixable)\` to the rule id.
`);
}
