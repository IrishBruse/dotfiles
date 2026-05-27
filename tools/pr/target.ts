import { spawnSync } from "node:child_process";

/** PR number or URL; defaults to the PR for the current branch via `gh pr view`. */
export function resolvePrTarget(
  explicit: string | undefined,
  repoRoot: string
): string {
  if (explicit !== undefined && explicit !== "") {
    return explicit;
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
