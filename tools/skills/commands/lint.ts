import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import {
  defaultLintRoots,
  discoverSkillFiles,
  displayPath,
  isMarkdownPath,
} from "../lint/discover.ts";
import { fixSkillContent } from "../lint/fix.ts";
import { printDiagnostic, printFixed, printSummary } from "../lint/format.ts";
import { lintSkillContent } from "../lint/run.ts";
import type { Diagnostic } from "../lint/types.ts";
import { printHelp } from "./help.ts";

interface LintOptions {
  fix: boolean;
  paths: string[];
}

function printError(message: string): void {
  process.stderr.write(`skills: ${message}\n`);
}

function parseLintArgs(argv: string[]): LintOptions | "help" | "error" {
  let fix = false;
  const paths: string[] = [];

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") return "help";
    if (arg === "--fix") {
      fix = true;
      continue;
    }
    if (arg.startsWith("-")) return "error";
    paths.push(arg);
  }

  return { fix, paths };
}

async function lintFile(filePath: string): Promise<Diagnostic[]> {
  const content = await readFile(filePath, "utf8");
  return lintSkillContent(content);
}

export async function runLint(argv: string[]): Promise<number> {
  const parsed = parseLintArgs(argv);
  if (parsed === "help") {
    printHelp();
    return 0;
  }
  if (parsed === "error") {
    printError("unknown option");
    printError("Try skills lint --help");
    return 1;
  }

  const files =
    parsed.paths.length > 0
      ? parsed.paths
      : await discoverSkillFiles(defaultLintRoots());

  if (files.length === 0) {
    printError("no skill markdown files found");
    return 1;
  }

  let warningCount = 0;
  let filesWithWarnings = 0;
  let filesChecked = 0;

  for (const filePath of files) {
    if (!isMarkdownPath(filePath)) {
      printError(`${displayPath(filePath)}: not a markdown file (.md or .mdc)`);
      warningCount++;
      continue;
    }

    filesChecked++;

    let content: string;
    try {
      content = await readFile(filePath, "utf8");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      printError(`${displayPath(filePath)}: ${message}`);
      warningCount++;
      continue;
    }

    if (parsed.fix) {
      const fixed = fixSkillContent(content);
      if (fixed !== content) {
        try {
          await writeFile(filePath, fixed, "utf8");
          printFixed(filePath);
          content = fixed;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          printError(`${displayPath(filePath)}: ${message}`);
          warningCount++;
          continue;
        }
      }
    }

    const diagnostics = lintSkillContent(content);
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
