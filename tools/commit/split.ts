import { basename } from "node:path";

import { loadCommitConfig } from "./config.ts";
import { createCommit, stagePaths, unstageAll } from "./git.ts";
import { generateCommitMessageForPaths } from "./message.ts";
import { findConfigMatch, pathMatchesGlob } from "./matchConfig.ts";
import { parseNameStatus, type StagedFile } from "./parseDiff.ts";

export interface PrSplitSlice {
  paths: string[];
  message: string;
}

export interface SplitPlan {
  slices: PrSplitSlice[];
}

export interface SplitResult {
  committed: boolean;
  commitCount: number;
}

export function planPrSplit(
  repoRoot: string,
  nameStatus: string,
  diff: string
): SplitPlan {
  const files = parseNameStatus(nameStatus);
  const config = loadCommitConfig(repoRoot);
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const key = sliceKey(file.path, config);
    const paths = groups.get(key) ?? [];
    paths.push(file.path);
    groups.set(key, paths);
  }

  const slices: PrSplitSlice[] = [];
  for (const paths of groups.values()) {
    const scoped = config ? findConfigMatch(config, paths) : undefined;
    if (!scoped) {
      slices.push({ paths, message: miscMessage(paths) });
      continue;
    }
    const { message } = generateCommitMessageForPaths(
      repoRoot,
      nameStatus,
      diff,
      paths
    );
    slices.push({
      paths,
      message:
        message === ""
          ? paths.map((path) => basename(path)).join(", ")
          : message
    });
  }

  return { slices };
}

export function runPrSplit(
  plan: SplitPlan,
  printOnly: boolean,
  options: {
    cwd: string;
    stagedFiles: StagedFile[];
    interactive: boolean;
  }
): SplitResult {
  if (plan.slices.length === 0) {
    return { committed: false, commitCount: 0 };
  }

  printSplitPlan(plan);

  if (printOnly || plan.slices.length === 1 || !options.interactive) {
    return { committed: false, commitCount: 0 };
  }

  return executeSplit(plan, options.cwd, options.stagedFiles);
}

function printSplitPlan(plan: SplitPlan): void {
  for (const [index, slice] of plan.slices.entries()) {
    if (index > 0) {
      console.error("");
    }
    console.error(`#${String(index + 1)} ${slice.message}`);
    for (const path of slice.paths) {
      console.error(`  - ${path}`);
    }
  }
}

function executeSplit(
  plan: SplitPlan,
  cwd: string,
  stagedFiles: StagedFile[]
): SplitResult {
  unstageAll(cwd);

  let commitCount = 0;
  for (const slice of plan.slices) {
    const paths = pathsForStaging(slice.paths, stagedFiles);
    stagePaths(cwd, paths);
    createCommit(cwd, slice.message);
    commitCount += 1;
  }

  return { committed: true, commitCount };
}

function pathsForStaging(paths: string[], stagedFiles: StagedFile[]): string[] {
  const staged = new Set<string>();
  for (const path of paths) {
    const file = stagedFiles.find((entry) => entry.path === path);
    if (file?.previousPath !== undefined) {
      staged.add(file.previousPath);
    }
    staged.add(path);
  }
  return [...staged];
}

function miscMessage(paths: string[]): string {
  const names = paths.map((path) => basename(path)).join(", ");
  return `misc: ${names}`;
}

function sliceKey(
  path: string,
  config: ReturnType<typeof loadCommitConfig>
): string {
  if (config?.scopes) {
    for (const [glob, rule] of Object.entries(config.scopes)) {
      if (!pathMatchesGlob(path, glob)) {
        continue;
      }
      const sliceBase = rule.group ?? glob;
      const match = findConfigMatch(config, [path]);
      if (match?.name) {
        return `${sliceBase}\0${match.name}`;
      }
      if (typeof rule.name === "string") {
        return `${sliceBase}\0${rule.name}`;
      }
      return sliceBase;
    }
  }
  return path.includes("/") ? (path.split("/")[0] ?? path) : path;
}

