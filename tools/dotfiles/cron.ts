import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { printError } from "./paint.ts";

const BEGIN_MARKER = "# BEGIN dotfiles managed cron";
const END_MARKER = "# END dotfiles managed cron";

function managedCronPath(dotfilesRoot: string): string {
  return path.join(dotfilesRoot, "home", ".config", "cron", "jobs.cron");
}

function stripManagedBlock(crontab: string): string {
  const lines = crontab.split(/\r?\n/);
  const kept: string[] = [];
  let inManagedBlock = false;

  for (const line of lines) {
    if (line === BEGIN_MARKER) {
      inManagedBlock = true;
      continue;
    }
    if (line === END_MARKER) {
      inManagedBlock = false;
      continue;
    }
    if (!inManagedBlock) {
      kept.push(line);
    }
  }

  return kept.join("\n").trimEnd();
}

function formatManagedBlock(jobs: string): string {
  const trimmedJobs = jobs.trim();
  if (trimmedJobs === "") {
    return `${BEGIN_MARKER}\n${END_MARKER}`;
  }
  return `${BEGIN_MARKER}\n${trimmedJobs}\n${END_MARKER}`;
}

export function buildManagedCrontab(
  existingCrontab: string,
  managedJobs: string
): string {
  const unmanagedCrontab = stripManagedBlock(existingCrontab);
  const managedBlock = formatManagedBlock(managedJobs);
  if (unmanagedCrontab === "") {
    return `${managedBlock}\n`;
  }
  return `${unmanagedCrontab}\n\n${managedBlock}\n`;
}

function currentCrontab(): string | null {
  const result = spawnSync("crontab", ["-l"], { encoding: "utf8" });
  if (result.error) {
    printError(`dotfiles cron: ${result.error.message}`);
    return null;
  }
  if (result.status === 0) {
    return result.stdout;
  }
  if (result.stdout === "" && /no crontab for/i.test(result.stderr)) {
    return "";
  }

  printError(`dotfiles cron: failed to read current crontab`);
  if (result.stderr.trim() !== "") {
    printError(result.stderr.trim());
  }
  return null;
}

export function runDotfilesCron(
  dotfilesRoot = path.resolve(homedir(), "dotfiles")
): number {
  const jobsPath = managedCronPath(dotfilesRoot);
  if (!fs.existsSync(jobsPath)) {
    printError(`dotfiles cron: missing ${jobsPath}`);
    return 1;
  }

  const existingCrontab = currentCrontab();
  if (existingCrontab === null) {
    return 1;
  }

  const managedJobs = fs.readFileSync(jobsPath, "utf8");
  const nextCrontab = buildManagedCrontab(existingCrontab, managedJobs);
  const result = spawnSync("crontab", ["-"], {
    encoding: "utf8",
    input: nextCrontab
  });

  if (result.error) {
    printError(`dotfiles cron: ${result.error.message}`);
    return 1;
  }
  if (result.status !== 0) {
    printError("dotfiles cron: failed to install crontab");
    if (result.stderr.trim() !== "") {
      printError(result.stderr.trim());
    }
    return 1;
  }

  process.stdout.write(`Installed managed cron jobs from ${jobsPath}\n`);
  return 0;
}
