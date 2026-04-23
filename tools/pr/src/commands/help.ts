export function printHelp(): void {
  console.log(
    [
      "pr — GitHub pull request helper",
      "",
      "Usage:",
      "  pr [command]",
      "",
      "Commands:",
      "  create         Prepare or open a new pull request for this branch",
      "  update         Refresh PR title & body from current diff (agent + gh pr edit)",
      "  review         Run agent on a PR, preview comment, then gh pr review --comment",
      "  (default)      Picks create or update from open PR on this branch",
      "",
      "Work (optional):",
      "  PR_CLI_WORK=true           NOVACORE title prefix + …/create|update|review/prompt.work.md beside each prompt.md",
      "  PR_CLI_WORKSPACE_ROOT=…    Anchor for agent cwd (default os.tmpdir()); workspaces are <anchor>/pr-cli/<repo>/<branch>/",
      "",
      "Options:",
      "  --print-prompt   After workspace prefetch, print the full resolved agent prompt to stdout and exit",
      "                   (no agent). Use as e.g. pr create --print-prompt, or pr --print-prompt alone to infer create|update.",
      "  -h, --help       Show this message",
    ].join("\n"),
  );
}
