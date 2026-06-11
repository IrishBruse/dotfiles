import process from "node:process";

import { parseCommitArgv } from "./argv.ts";
import {
  getRepoRoot,
  getStagedDiff,
  getStagedFileList,
  hasStagedChanges
} from "./git.ts";
import { printHelp } from "./help.ts";
import { generateCommitMessage } from "./message.ts";
import { parseNameStatus } from "./parseDiff.ts";
import { planPrSplit, runPrSplit } from "./split.ts";

export function main(argv: string[]): void {
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
  } catch {
    process.exit(1);
  }

  if (!hasStagedChanges(gitCwd)) {
    if (opts.print) {
      console.error("commit: no staged changes");
    }
    return;
  }

  const nameStatus = getStagedFileList(gitCwd);
  const diff = getStagedDiff(gitCwd);
  const stagedFiles = parseNameStatus(nameStatus);
  const stagedPaths = stagedFiles.map((f) => f.path);
  const plan = planPrSplit(repoRoot, nameStatus, diff);
  const interactive = process.stdout.isTTY === true;

  if (opts.print) {
    runPrSplit(plan, true, { cwd: gitCwd, stagedFiles, interactive });
    return;
  }

  const splitResult = runPrSplit(plan, false, {
    cwd: gitCwd,
    stagedFiles,
    interactive
  });
  if (splitResult.committed) {
    return;
  }

  const { message, confident } = generateCommitMessage(
    repoRoot,
    nameStatus,
    diff,
    stagedPaths
  );
  if (!confident || message === "") {
    process.exit(1);
  }

  process.stdout.write(`${message}\n`);
}

main(process.argv);
