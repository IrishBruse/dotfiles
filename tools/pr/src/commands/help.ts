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
      "Environment:",
      "  PR_PREVIEW_CODE   VS Code binary for preview (default: code); must support --wait",
      "  PR_*_NO_CONFIRM=1 Skip editor preview + y/n (create / update / review)",
      "",
      "Global options:",
      "  -h, --help     Show this message",
    ].join("\n"),
  );
}
