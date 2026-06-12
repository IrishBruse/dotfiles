import process from "node:process";

import { loadCommitConfig } from "./config/config.ts";
import { findConfigMatch } from "./config/match.ts";
import { parseNameStatus } from "./diff/parse.ts";
import {
  getRepoRoot,
  getStagedDiff,
  getStagedFileList,
  getUnstagedDiff,
  getUnstagedFileList,
  hasStagedChanges,
  hasUnstagedChanges,
  pushBranch
} from "./git.ts";
import { printHelp } from "./help.ts";
import { generateCommitMessage } from "./message/generate.ts";
import { writeCommitSubject } from "./output.ts";
import { planPrSplit, runPrSplit } from "./split/plan.ts";

interface CommitOptions {
  help: boolean;
  print: boolean;
}

function parseCommitArgv(argv: string[]): CommitOptions | "error" {
  let help = false;
  let print = false;

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "-p" || arg === "--print") {
      print = true;
      continue;
    }
    return "error";
  }

  return { help, print };
}

function isFlag(arg: string): boolean {
  return arg.startsWith("-");
}

export function runCommit(argv: string[], push: boolean): void {
  const opts = parseCommitArgv(argv);
  if (opts === "error") {
    console.error("commit: unexpected arguments (try commit -h)");
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    return;
  }

  const gitCwd = process.cwd();
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(gitCwd);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`commit: ${message}`);
    process.exit(1);
  }

  const useStaged = hasStagedChanges(gitCwd);
  if (!useStaged && !hasUnstagedChanges(gitCwd)) {
    if (opts.print) {
      console.error("commit: no changes");
    }
    return;
  }

  const nameStatus = useStaged ? getStagedFileList(gitCwd) : getUnstagedFileList(gitCwd);
  const diff = useStaged ? getStagedDiff(gitCwd) : getUnstagedDiff(gitCwd);
  const stagedFiles = parseNameStatus(nameStatus);
  const stagedPaths = stagedFiles.map((f) => f.path);
  const config = loadCommitConfig(repoRoot);
  const slices = planPrSplit(repoRoot, nameStatus, diff, stagedFiles, config);
  const interactive = process.stdout.isTTY === true;

  const splitOptions = {
    cwd: gitCwd,
    stagedFiles,
    interactive,
    commit: !useStaged
  };

  if (opts.print) {
    runPrSplit(slices, true, splitOptions);
    return;
  }

  const splitResult = runPrSplit(slices, false, splitOptions);
  if (splitResult.committed) {
    if (push) {
      pushBranch(gitCwd);
    }
    return;
  }

  if (slices.length === 1 && config && findConfigMatch(config, stagedPaths)) {
    writeCommitSubject(slices[0]!.message);
    return;
  }

  const { message, confident } = generateCommitMessage(
    repoRoot,
    nameStatus,
    diff,
    stagedPaths,
    config
  );
  if (!confident || message === "") {
    process.exit(1);
  }

  writeCommitSubject(message);
}

export function main(argv: string[]): void {
  const args = argv.slice(2);
  const first = args[0];

  if (first === "-h" || first === "--help") {
    printHelp();
    return;
  }

  if (first === "push") {
    runCommit(args.slice(1), true);
    return;
  }

  if (first !== undefined && !isFlag(first)) {
    console.error(`commit: unknown command "${first}" (try commit -h)`);
    process.exit(1);
  }

  runCommit(args, false);
}

main(process.argv);
