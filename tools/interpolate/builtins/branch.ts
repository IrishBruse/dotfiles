import { spawnSync } from "node:child_process";
import process from "node:process";

export const key = "branch";

export function resolve(): string {
  const r = spawnSync("git", ["branch", "--show-current"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  if (r.status !== 0) {
    return "";
  }
  return (r.stdout ?? "").trim();
}
