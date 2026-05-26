export function printHelp(): void {
  console.log(
    [
      "pr - GitHub pull request helper",
      "",
      "Usage:",
      "  pr create",
      "",
      "Commands:",
      "  create   Prepare or open a new pull request for this branch",
      "",
      "  -h, --help   Show this message"
    ].join("\n")
  );
}
