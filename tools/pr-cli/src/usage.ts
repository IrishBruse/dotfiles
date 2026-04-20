import process from "node:process";

export function usage(): never {
  process.stderr.write(`Usage:
  pr [options] [<pr-number-or-url>]
  pr review [options] [<pr-number-or-url>]
  pr update [options] [<pr-number-or-url>]
  pr open|add|new|create [options] [<jira-key e.g. NOVACORE-123>]

When you pass a PR number or URL, it must resolve with \`gh pr view\` in the
workspace first. The default command then picks add vs update from the last
successful run (stored under XDG_STATE_HOME or ~/.local/state/pr-cli/last-head.json):
new PR → add, new commits → update, same HEAD → short add-style pass.

\`pr review\` forces first-pass review (skills/review.md; verdict + merge readiness). Same review skill as default \`pr <pr>\` / \`pr update\`, without auto add/update from state.

\`pr open\` (same as \`add\` / \`new\` / \`create\`) drafts a new PR when none exists yet: runs the agent with \`--print\`, expects a final \`\`\`json\`\`\` block with {"title","body"}, shows a preview, then ENTER runs \`gh pr create\` or ESC cancels.

Requires \`gh\` and \`agent\` on PATH.

If \`PR_TITLE_JIRA_KEY\` is set (e.g. NOVACORE), the PR title must match \`<KEY>-<digits>\` at the start
when a PR is given; otherwise the CLI exits before starting the agent.

Options:
  -w, --workspace <dir>   Agent --workspace (default: cwd)
  -p, --print               Pass --print to agent (non-interactive)
  -h, --help

  pr 42 -- --model sonnet-4
`);
  process.exit(2);
}
