export function printHelp(): void {
  console.log(
    [
      "pr - GitHub pull request helper",
      "",
      "Usage:",
      "  pr create",
      "",
      "Commands:",
      "  create   Expand pr-create via interpolate, run Cursor agent, gh pr create",
      "",
      "  -h, --help   Show this message"
    ].join("\n")
  );
}
