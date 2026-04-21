export function printHelp(): void {
  console.log(
    [
      "pr — GitHub pull request helper (skeleton)",
      "",
      "Usage:",
      "  pr [command]",
      "",
      "Commands:",
      "  create         Prepare or open a new pull request for this branch",
      "  update         Refresh an existing pull request for this branch",
      "  review         Review a provided pull request url or number (skeleton)",
      "  none           Picks create or updated based on the open repo",
      "",
      "Global options:",
      "  -h, --help     Show this message",
    ].join("\n"),
  );
}
