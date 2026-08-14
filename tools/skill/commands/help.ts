import process from "node:process";

export function printHelp(): void {
  process.stderr.write(`skill - lint and list agent skills

Usage:
  skill <command>

Commands:
  ls       List skills from global and project locations
  lint     Check skill markdown against tools/skill/rules

skill ls scans standard agent skill roots under ~ (for example ~/.agents/skills,
~/.cursor/skills, ~/.claude/skills, ~/.config/opencode/skills) and skills.sh-
compatible project paths under the current directory and its parents.
Nested category folders are listed with relative paths (for example github/pr,
gp/authentication). Symlink roots that resolve under another scanned root are
skipped so the same skill is not listed twice.
~/.cursor/skills-cursor is omitted unless you pass --cursor-builtin.

With no paths, skill lint scans the same skill roots for .md and .mdc
files. With a path, lint scopes to that skill folder: a SKILL.md file lints
every markdown file in its directory, and a directory path lints that tree.
With a skill id or name (for example jira or github/pr), lint finds the skill
in global and project skill roots before linting that folder. Use a path when
the skill is not under a standard root.

Shared options:
  --cursor-builtin   Include ~/.cursor/skills-cursor and project skills-cursor

Lint options:
  --fix              Apply safe auto-fixes, then report remaining warnings
                     (typical: skill lint jira --fix or skill lint path/to/SKILL.md --fix)
                     Auto-fixes: block-scalar descriptions, orphan frontmatter
                     lines, nested reference links, prose semicolons,
                     and non-ASCII
  --show-fixable     Include auto-fixable warnings in output (hidden by default)

Options:
  -h, --help   Show help

Exit code 1 when lint finds warnings or ls finds no skills. Lint diagnostics
use ESLint-style output on stderr: file path, then indented
\`line:col  severity  message  @skill/rule-id\` lines. Auto-fixable rules
append \`(fixable)\` to the rule id.
`);
}
