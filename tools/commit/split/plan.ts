import { basename } from "node:path";

import type { CommitConfig } from "../config/config.ts";
import { loadCommitConfig } from "../config/config.ts";
import { findConfigMatch, resolveSliceGroup } from "../config/match.ts";
import { filterDiff, filterNameStatus } from "../diff/parse.ts";
import { createCommit, stagePaths, unstageAll } from "../git.ts";
import { generateCommitMessage } from "../message/generate.ts";
import { printSplitPlan } from "../output.ts";
import type { PrSplitSlice, SplitResult, StagedFile } from "../types.ts";

export function planPrSplit(
  repoRoot: string,
  nameStatus: string,
  diff: string,
  stagedFiles: StagedFile[],
  config: CommitConfig | undefined = loadCommitConfig(repoRoot)
): PrSplitSlice[] {
  const groups = new Map<string, string[]>();

  for (const file of stagedFiles) {
    const key = resolveSliceGroup(file.path, config);
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
    const pathSet = new Set(paths);
    const { message } = generateCommitMessage(
      repoRoot,
      filterNameStatus(nameStatus, pathSet),
      filterDiff(diff, pathSet),
      paths,
      config
    );
    slices.push({
      paths,
      message: message === "" ? pathBasenames(paths) : message
    });
  }

  return slices;
}

export function runPrSplit(
  slices: PrSplitSlice[],
  printOnly: boolean,
  options: {
    cwd: string;
    stagedFiles: StagedFile[];
    interactive: boolean;
    commit: boolean;
  }
): SplitResult {
  if (slices.length === 0) {
    return { committed: false };
  }

  printSplitPlan(slices, options.stagedFiles);

  if (printOnly) {
    return { committed: false };
  }

  if (
    !options.commit &&
    (slices.length === 1 || !options.interactive)
  ) {
    return { committed: false };
  }

  return executeSplit(slices, options.cwd, options.stagedFiles);
}

function executeSplit(
  slices: PrSplitSlice[],
  cwd: string,
  stagedFiles: StagedFile[]
): SplitResult {
  unstageAll(cwd);

  const byPath = new Map(stagedFiles.map((file) => [file.path, file]));

  for (const slice of slices) {
    const paths = pathsForStaging(slice.paths, byPath);
    stagePaths(cwd, paths);
    createCommit(cwd, slice.message);
  }

  return { committed: true };
}

function pathsForStaging(
  paths: string[],
  byPath: Map<string, StagedFile>
): string[] {
  const staged = new Set<string>();
  for (const path of paths) {
    const file = byPath.get(path);
    if (file?.previousPath !== undefined) {
      staged.add(file.previousPath);
    }
    staged.add(path);
  }
  return [...staged];
}

function miscMessage(paths: string[]): string {
  return `misc: ${pathBasenames(paths)}`;
}

function pathBasenames(paths: string[]): string {
  return paths.map((path) => basename(path)).join(", ");
}
