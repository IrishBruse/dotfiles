import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE_RELATIVE = ".github/PULL_REQUEST_TEMPLATE.md";

export function readPullRequestTemplate(
  repoRoot: string
): string | undefined {
  const path = join(repoRoot, TEMPLATE_RELATIVE);
  if (!existsSync(path)) {
    return undefined;
  }
  const text = readFileSync(path, "utf8");
  if (text.trim() === "") {
    return undefined;
  }
  return text.trimEnd();
}

export function appendPullRequestTemplate(
  lines: string[],
  repoRoot: string
): void {
  const template = readPullRequestTemplate(repoRoot);
  lines.push("", "Repo PR template (fill this in for the PR body):");
  if (template === undefined) {
    lines.push("none");
    return;
  }
  lines.push("", template);
}
