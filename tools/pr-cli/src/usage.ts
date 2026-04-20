import process from "node:process";

export function usage(): never {
  process.stderr.write(`Usage:
  pr [<pr-number-or-url>]
  pr review [<pr-number-or-url>]
  pr update [<pr-number-or-url>]
  pr open|add|new|create [<jira-key e.g. NOVACORE-123>]

Flags:
  -h, --help     Print this message and exit

When you pass a PR number or URL, it must resolve with \`gh pr view\` in the
current working directory first. The default command picks add vs update from the last
successful run (stored under ~/.local/state/pr-cli/last-head.json):
first time for that PR → add, new commits → update, same HEAD → short add-style pass.

\`pr review\` forces first-pass review (\`prompts/review.md\`). Same prompt as default \`pr <pr>\` / \`pr update\`, without that state-based choice.

\`pr open\` (same as \`add\` / \`new\` / \`create\`) drafts a new PR when none exists yet (\`prompts/open.md\`): runs the agent with \`--print\`, expects a final \`\`\`json\`\`\` block with {"title","body"}, shows a preview, then ENTER runs \`gh pr create\` or ESC cancels.

Use \`--\` before extra arguments to forward them to \`agent\` (e.g. \`pr 42 -- --model sonnet-4\`).

Requires \`gh\` and \`agent\` on PATH.

If \`PR_TITLE_JIRA_KEY\` is set (e.g. NOVACORE), the PR title must match \`<KEY>-<digits>\` at the start
when a PR is given; otherwise the CLI exits before starting the agent.
`);
  process.exit(2);
}
