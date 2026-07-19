import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  defaultSkillRoots,
  discoverSkillFiles,
  isMarkdownPath,
} from "../lint/discover.ts";
import { printDiagnostic, printSummary } from "../lint/format.ts";
import { lintSkillContent } from "../lint/run.ts";
import type { Diagnostic } from "../lint/types.ts";
import { printHelp } from "./help.ts";

function printError(message: string): void {
  process.stderr.write(`skills: ${message}\n`);
}

async function lintFile(filePath: string): Promise<Diagnostic[]> {
  const content = await readFile(filePath, "utf8");
  return lintSkillContent(content);
}

export async function runLint(argv: string[]): Promise<number> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    return 0;
  }

  if (argv.length > 0) {
    for (const arg of argv) {
      if (arg.startsWith("-")) {
        printError(`unknown option ${arg}`);
        printError("Try skills lint --help");
        return 1;
      }
    }
  }

  const files =
    argv.length > 0
      ? argv
      : await discoverSkillFiles(defaultSkillRoots());

  if (files.length === 0) {
    printError("no skill markdown files found");
    return 1;
  }

  let warningCount = 0;
  let filesWithWarnings = 0;
  let filesChecked = 0;

  for (const filePath of files) {
    if (!isMarkdownPath(filePath)) {
      printError(`${filePath}: not a markdown file (.md or .mdc)`);
      warningCount++;
      continue;
    }

    filesChecked++;

    let diagnostics: Diagnostic[];
    try {
      diagnostics = await lintFile(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      printError(`${filePath}: ${message}`);
      warningCount++;
      continue;
    }

    if (diagnostics.length === 0) continue;

    filesWithWarnings++;
    warningCount += diagnostics.length;
    for (const diagnostic of diagnostics) {
      printDiagnostic(filePath, diagnostic);
    }
  }

  printSummary(warningCount, 0, filesWithWarnings, filesChecked);

  return warningCount > 0 ? 1 : 0;
}
