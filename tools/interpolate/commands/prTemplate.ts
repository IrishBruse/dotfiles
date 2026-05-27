import { spawnSync } from "node:child_process";
import process from "node:process";

export const key = "prTemplate";

const SCRIPT = [
  "for f in .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md docs/pull_request_template.md;",
  'do test -f "$f" && { echo "From $f:"; cat "$f"; exit 0; };',
  "done;",
  'echo "(none)"'
].join(" ");

export function resolve(): string {
  const r = spawnSync("sh", ["-c", SCRIPT], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  if (r.status !== 0) {
    return "(none)";
  }
  const out = (r.stdout ?? "").trimEnd();
  return out === "" ? "(none)" : out;
}
