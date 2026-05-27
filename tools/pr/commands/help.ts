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
      "  create   Expand pr-create via interpolate, run Cursor agent (stream-json)",
      "  update   Expand pr-update via interpolate, run Cursor agent, gh pr edit",
      "",
      "  -h, --help   Show this message"
    ].join("\n")
  );
}
