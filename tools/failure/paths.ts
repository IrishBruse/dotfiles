import path from "node:path";
import os from "node:os";

import { repoNameForPath } from "./repoName.ts";

/** Incident logs live under ~/.agents/skills/failure/references/. */
export const REFERENCES_DIR = path.join(
  os.homedir(),
  ".agents",
  "skills",
  "failure",
  "references"
);

/**
 * Markdown filename for incidents from `cwd`: `<repo>.md` under ~/git, else `misc.md`.
 */
export function incidentFileName(cwd: string): string {
  const repo = repoNameForPath(cwd);
  return repo === null ? "misc.md" : `${repo}.md`;
}

/**
 * Absolute path to the incident log for `cwd`.
 */
export function incidentFilePath(cwd: string): string {
  return path.join(REFERENCES_DIR, incidentFileName(cwd));
}
