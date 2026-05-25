import { spawnSync } from "node:child_process";

/** Resolves the web URL of a PR. Omit `target` to use the PR for the current branch (e.g. right after `gh pr create`). */
export function getPrViewUrl(options: { target?: string; cwd?: string }): string | null {
  const { target, cwd } = options;
  const args = ["pr", "view"];
  if (target !== undefined && target !== "") {
    args.push(target);
  }
  args.push("--json", "url");
  const r = spawnSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...(cwd !== undefined ? { cwd } : {}),
  });
  if (r.status !== 0) {
    return null;
  }
  try {
    const j = JSON.parse(r.stdout ?? "{}") as { url?: unknown };
    if (typeof j.url === "string" && j.url.length > 0) {
      return j.url;
    }
  } catch {
    // ignore
  }
  return null;
}

/** stdout: one newline, URL, one newline. */
export function printPrUrlWithMargins(url: string): void {
  process.stdout.write(`\n${url}\n`);
}
