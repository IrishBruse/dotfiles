import { execFileSync } from "node:child_process";

/** Run `command` with `sh -c`. Throws on non-zero exit. */
export function $(command: string): string {
  return execFileSync("sh", ["-c", command], { encoding: "utf8" });
}

/** Single-quote for POSIX `sh -c` fragments (paths, etc.). */
export function q(s: string): string {
  return `'${s.replace(/'/g, `'\"'\"'`)}'`;
}
