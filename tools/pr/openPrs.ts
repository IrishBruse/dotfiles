import { spawnSync } from "node:child_process";

export type OpenPr = {
  number: number;
  title: string;
  url: string;
};

export function listOpenPrsForBranch(
  repoRoot: string,
  branch: string
): OpenPr[] | undefined {
  const r = spawnSync(
    "gh",
    [
      "pr",
      "list",
      "--state",
      "open",
      "--json",
      "number,title,url,headRefName"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  if (r.status !== 0) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "[]");
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  const out: OpenPr[] = [];
  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { number: unknown }).number !== "number" ||
      typeof (item as { title: unknown }).title !== "string" ||
      typeof (item as { url: unknown }).url !== "string" ||
      (item as { headRefName: unknown }).headRefName !== branch
    ) {
      continue;
    }
    out.push({
      number: (item as { number: number }).number,
      title: (item as { title: string }).title,
      url: (item as { url: string }).url
    });
  }
  return out;
}

export function appendOpenPrsForBranch(
  lines: string[],
  repoRoot: string,
  branch: string
): void {
  const prs = listOpenPrsForBranch(repoRoot, branch);
  lines.push("", "Existing open PRs for this branch:");
  if (prs === undefined || prs.length === 0) {
    lines.push("none");
    return;
  }
  for (const pr of prs) {
    lines.push(`- #${String(pr.number)} ${pr.title} (${pr.url})`);
  }
}
