import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $, q } from "../../shell.ts";

const DCONF_STALE_RUN_PREFIXES = [
  "install-last-run=",
  "refresh-last-run="
] as const;

function filterStaleRunLines(dump: string): string {
  return dump
    .split("\n")
    .filter(
      (line) =>
        !DCONF_STALE_RUN_PREFIXES.some((prefix) => line.startsWith(prefix))
    )
    .join("\n");
}

export function syncDconf(repo: string): void {
  const dconfDir = join(repo, "home/.config/dconf");
  const dconfOut = join(dconfDir, "user.ini");
  mkdirSync(dconfDir, { recursive: true });

  $(`dconf dump / >${q(dconfOut)}`);

  const dump = readFileSync(dconfOut, "utf8");
  writeFileSync(dconfOut, filterStaleRunLines(dump));
}
