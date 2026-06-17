import { spawnSync } from "node:child_process";

export type PrAction =
  | { mode: "create" }
  | { mode: "update"; prTarget?: string };

export function resolvePrAction(
  repoRoot: string,
  explicitTarget?: string
): PrAction {
  if (explicitTarget !== undefined && explicitTarget !== "") {
    return { mode: "update", prTarget: explicitTarget };
  }
  const number = prNumberForCurrentBranch(repoRoot);
  if (number !== undefined) {
    return { mode: "update", prTarget: number };
  }
  return { mode: "create" };
}

function prNumberForCurrentBranch(repoRoot: string): string | undefined {
  const r = spawnSync("gh", ["pr", "view", "--json", "number"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (r.status !== 0) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    return undefined;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { number: unknown }).number !== "number"
  ) {
    return undefined;
  }
  return String((parsed as { number: number }).number);
}
