import { spawnSync } from "node:child_process";

export type ResolvePrTargetOptions = {
  /** Skip `gh pr view` lookup; use the current branch (for `pr update --dry`). */
  assumeExists?: boolean;
};

function readCurrentBranch(repoRoot: string): string {
  const r = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  const branch = (r.stdout ?? "").trim();
  if (r.status !== 0 || branch === "") {
    throw new Error("could not read current branch");
  }
  return branch;
}

/** PR number or URL; defaults to the PR for the current branch via `gh pr view`. */
export function resolvePrTarget(
  explicit: string | undefined,
  repoRoot: string,
  options?: ResolvePrTargetOptions
): string {
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }
  if (options?.assumeExists === true) {
    return readCurrentBranch(repoRoot);
  }
  const r = spawnSync("gh", ["pr", "view", "--json", "number"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (r.status !== 0) {
    const msg =
      (r.stderr ?? r.stdout ?? "").trim() ||
      "gh pr view failed - pass a PR number/URL or open a PR from this branch";
    throw new Error(msg);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    throw new Error("could not parse gh pr view JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { number: unknown }).number !== "number"
  ) {
    throw new Error("no PR number on this branch");
  }
  return String((parsed as { number: number }).number);
}
