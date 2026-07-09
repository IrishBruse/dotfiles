export function printHelp(): void {
  console.log(
    [
      "pr - GitHub pull request helper",
      "",
      "Usage:",
      "  pr [number|url]",
      "  pr fix [number|url]",
      "",
      "Creates or updates the pull request for the current branch.",
      "If a PR already exists on the branch, updates it; otherwise creates one.",
      "Pass an optional PR number or URL to target a specific PR for update.",
      "",
      "  pr fix checks CI and unresolved review comments on the current PR,",
      "  injects failed workflow logs and review threads, and runs the",
      "  pr skill fix branch to repair merge-blocking failures and feedback.",
      "",
      "Commands:",
      "  fix          Fix failed PR checks, workflows, and review comments",
      "",
      "Options:",
      "  -p, --print  Print the resolved prompt and exit",
      "  -h, --help   Show this message",
      "",
      "Environment:",
      "  WORK=true    Require <PROJECT>-<ticket> title prefix (valid recent Jira ticket)"
    ].join("\n")
  );
}
