export function printHelp(): void {
  console.error(`commit - suggest commit messages and split staged work into PRs

Usage:
  commit [options]

Options:
  --print          Show the PR split plan without committing or pushing
  -h, --help       This message

Behavior:
  Uses staged changes when present; otherwise stages and commits unstaged and untracked changes.
  With staged changes, prints a commit subject to stdout (for prepare-commit-msg).
  When run interactively with multiple staged slices, commits each slice in plan order.
  Use --print to preview the split plan on stderr without committing.
`);
}
