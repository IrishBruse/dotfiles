import { spawnSync } from "node:child_process";

import { runCreate } from "./commands/create/index.ts";
import { runUpdate } from "./commands/update/index.ts";

function currentBranchHasOpenPr(): boolean {
  const result = spawnSync(
    "gh",
    ["pr", "view", "--json", "number"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(result.stdout ?? "{}");
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "number" in parsed &&
      typeof (parsed as { number: unknown }).number === "number"
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function inferAndRun(restArgs: string[]): void {
  if (currentBranchHasOpenPr()) {
    console.log("update");
    runUpdate(restArgs);
    return;
  }
  console.log("create");
  runCreate(restArgs);
}
