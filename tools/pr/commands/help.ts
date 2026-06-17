export function printHelp(): void {
  console.log(
    [
      "pr - GitHub pull request helper",
      "",
      "Usage:",
      "  pr create",
      "  pr update [number|url]",
      "",
      "Commands:",
      "  create   Run Cursor agent with the pr-create skill",
      "  update   Run Cursor agent with the pr-update skill",
      "",
      "  -h, --help   Show this message",
      "",
      "Environment:",
      "  WORK=true    Require NOVACORE-<ticket> title prefix (valid recent Jira ticket)"
    ].join("\n")
  );
}
