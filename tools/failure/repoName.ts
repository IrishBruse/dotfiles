import path from "node:path";
import os from "node:os";

const GIT_ROOT = path.join(os.homedir(), "git");

/**
 * First path segment under ~/git for `cwd`, or null when not under that tree.
 */
export function repoNameForPath(cwd: string): string | null {
  const resolved = path.resolve(cwd);
  const gitRoot = path.resolve(GIT_ROOT);
  const relative = path.relative(gitRoot, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  const [name] = relative.split(path.sep);
  return name ?? null;
}
