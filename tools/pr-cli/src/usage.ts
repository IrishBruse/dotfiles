import process from "node:process";

export function usage(): never {
  process.stderr.write(`Usage:
  pr [<pr-number-or-url>]
  pr review [<pr-number-or-url>]
  pr update [<pr-number-or-url>]
  pr create [<jira-key e.g. NOVACORE-123>]

Flags:
  -h, --help     Print this message and exit

When you pass a PR number or URL, it must resolve with \`gh pr view\` in the
current working directory first. The default command picks add vs update from the last
successful run (stored under ~/.local/state/pr-cli/last-head.json):
first time for that PR → add, new commits → update, same HEAD → short add-style pass.

Default \`pr\` picks \`prompts/review.md\` vs \`prompts/update.md\` from saved HEAD (same as explicit \`pr review\` / \`pr update\`).

\`pr\`, \`pr review\`, and \`pr update\` run the agent with \`--print\`, expect a final \`\`\`json\`\`\` block with \`title\` and \`body\` (and \`pr\` only when no PR was passed on the argv), render markdown in the terminal, then ENTER runs \`gh pr review --comment\` or ESC cancels.

\`pr create\` (\`prompts/create.md\`) uses the same JSON and TTY pattern; ENTER runs \`gh pr create\`.

Requires \`gh\` and \`agent\` on PATH.

If \`PR_TITLE_JIRA_KEY\` is set (e.g. NOVACORE), the PR title must match \`<KEY>-<digits>\` at the start when a PR is passed on the argv (before the agent) or when the PR is resolved from JSON (before posting).
`);
  process.exit(2);
}
