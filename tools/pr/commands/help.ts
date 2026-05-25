export function printHelp(): void {
  console.log(
    [
      "pr - GitHub pull request helper",
      "",
      "Usage:",
      "  pr [command]",
      "",
      "Commands:",
      "  create         Prepare or open a new pull request for this branch",
      "  update         Refresh PR title & body from current diff (agent + gh pr edit)",
      "  review         Run agent on a PR, preview comment, then gh pr review --comment",
      "  (default)      Prints one line (e.g. updating PR #N with URL, or creating a PR from this branch),",
      "                   then runs that command; a GitHub PR URL as the first arg prints a review line and runs `pr review <url>`.",
      "",
      "Work (optional):",
      "  PR_CLI_WORK=true           NOVACORE title prefix; enables ?work: lines in ~/.config/interpolate/pr-*.md",
      "  PR_GIT_CWD=...                Directory inside a git work tree for `git` (default: current shell cwd). Also used to place PR_PROMPT.md for --debug when inside a repo.",
      "",
      "Options:",
      "  --print-prompt   After expanding the interpolate prompt, print it to stdout and exit (no agent).",
      "  --debug          Write the same prompt to PR_PROMPT.md (repo root from PR_GIT_CWD, else cwd) and exit (no agent).",
      "  --no-agent       Do not run the Cursor agent. create/review write a small stub PR.md for you to edit;",
      "                   update seeds PR.md (GitHub snapshot was only in the prompt as CURRENT.md).",
      "  --dir            Print the agent output directory on stderr when the agent runs (empty tmp dir for PR.md).",
      "  -y, --yes        create only: skip opening PR.md in VS Code; gh pr create uses the agent file as-is",
      "  --opus           Run the Cursor agent with the Opus model (claude-opus-4-7-high).",
      "  --codex          Run with Codex 5.3 (gpt-5.3-codex).",
      "  (default model)  If neither is set, uses composer-2 (agent --list-models).",
      "  -h, --help       Show this message"
    ].join("\n")
  );
}
