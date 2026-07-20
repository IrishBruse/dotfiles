import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { buildLintContexts } from "../rules/core/context.ts";
import {
  defaultSkillRoots,
  discoverSkillFiles,
  displayPath,
  isMarkdownPath,
  resolveLintScopes,
} from "../rules/engine/discover.ts";
import { fixSkillContent } from "../rules/engine/fix.ts";
import { isFixableDiagnostic } from "../rules/engine/fixable.ts";
import { printFileDiagnostics, printFixedFiles, printSummary } from "../rules/engine/format.ts";
import { lintSkillContent } from "../rules/engine/run.ts";
import { diagnosticSeverity, type Diagnostic } from "../rules/core/types.ts";
import { parseLintArgs } from "./argv.ts";
import { printHelp } from "./help.ts";

function printError(message: string): void {
  process.stderr.write(`skills: ${message}\n`);
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

  let files: string[];
  try {
    files =
      parsed.positional.length > 0
        ? await resolveLintScopes(parsed.positional)
        : await discoverSkillFiles(
            defaultSkillRoots({
              includeCursorBuiltin: parsed.cursorBuiltin,
            })
          );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    printError(message);
    return 1;
  }

  if (files.length === 0) {
    printError("no skill markdown files found");
    return 1;
  }

  const lintContexts = await buildLintContexts(files);

  let warningCount = 0;
  let errorCount = 0;
  let fixableCount = 0;
  let filesWithIssues = 0;
  let filesChecked = 0;
  const fixedFiles: string[] = [];

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

    let wasFixed = false;

    if (parsed.fix) {
      const fixed = fixSkillContent(content, filePath);
      if (fixed !== content) {
        try {
          await writeFile(filePath, fixed, "utf8");
          content = fixed;
          wasFixed = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          printError(`${displayPath(filePath)}: ${message}`);
          warningCount++;
          continue;
        }
      }
    }

    const context = lintContexts.get(filePath);
    const diagnostics = lintSkillContent(
      content,
      context ?? filePath
    );
    if (wasFixed && diagnostics.length === 0) {
      fixedFiles.push(filePath);
    }
    if (diagnostics.length === 0) continue;

    filesWithIssues++;
    for (const diagnostic of diagnostics) {
      if (isFixableDiagnostic(diagnostic)) {
        fixableCount++;
      }
      if (diagnosticSeverity(diagnostic) === "error") {
        errorCount++;
      } else {
        warningCount++;
      }
    }
    printFileDiagnostics(filePath, diagnostics);
  }

  printSummary(warningCount, errorCount, fixableCount, filesWithIssues, filesChecked);
  printFixedFiles(fixedFiles);

  return warningCount > 0 || errorCount > 0 ? 1 : 0;
}
