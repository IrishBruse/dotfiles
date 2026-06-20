import type { StowSummary } from "./types.ts";

const LINK_RE = /^LINK: (.+) => (.+)$/;
const UNLINK_RE = /^UNLINK: (.+?)( \(.*\))?$/;
const SKIP_RE = /^--- Skipping (.+) as it already points to (.+)$/;
const CONFLICT_RE = /^CONFLICT when .+: (.+)$/;
const MKDIR_RE = /^MKDIR: (.+?)( \(.*\))?$/;
const RMDIR_RE = /^RMDIR:? (.+?)( \(.*\))?$/;

export function emptySummary(): StowSummary {
  return {
    linked: [],
    removed: [],
    unchanged: [],
    warnings: [],
    conflicts: []
  };
}

export function parseStowOutput(lines: string[]): StowSummary {
  const summary = emptySummary();

  for (const line of lines) {
    const link = line.match(LINK_RE);
    if (link) {
      summary.linked.push(link[1]!);
      continue;
    }

    const unlink = line.match(UNLINK_RE);
    if (unlink) {
      summary.removed.push(unlink[1]!);
      continue;
    }

    const skip = line.match(SKIP_RE);
    if (skip) {
      summary.unchanged.push(skip[1]!);
      continue;
    }

    const conflict = line.match(CONFLICT_RE);
    if (conflict) {
      summary.conflicts.push(conflict[1]!);
      continue;
    }

    if (line.startsWith("--- ")) {
      summary.warnings.push(line);
      continue;
    }

    const mkdir = line.match(MKDIR_RE);
    if (mkdir) {
      summary.warnings.push(`mkdir ${mkdir[1]!}`);
      continue;
    }

    const rmdir = line.match(RMDIR_RE);
    if (rmdir) {
      summary.warnings.push(`rmdir ${rmdir[1]!}`);
      continue;
    }

    if (line.startsWith("MV:")) {
      summary.warnings.push(line);
    }
  }

  return summary;
}
