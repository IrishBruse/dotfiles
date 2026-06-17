export function printHelp(): void {
  console.log(
    [
      "pr - GitHub pull request helper",
      "",
      "Usage:",
      "  pr [number|url]",
      "",
      "Creates or updates the pull request for the current branch.",
      "If a PR already exists on the branch, updates it; otherwise creates one.",
      "Pass an optional PR number or URL to target a specific PR for update.",
      "",
      "Options:",
      "  -p, --print  Print the resolved prompt and exit",
      "  -h, --help   Show this message",
      "",
      "Environment:",
      "  WORK=true    Require NOVACORE-<ticket> title prefix (valid recent Jira ticket)"
    ].join("\n")
  );
}
