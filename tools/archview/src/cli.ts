#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { analyzeProject } from "./core/analyze.ts";
import { renderArchitectureIndexMarkdown } from "./report/markdown.ts";
import { writeReports } from "./report/write.ts";

const program = new Command();

program
    .name("archview")
    .description("Static architecture analysis for TypeScript projects")
    .version("0.1.0");

program
    .command("analyze")
    .description(
        "Write .context/architecture/*.md (topic pages); print a short reading guide on stdout",
    )
    .option(
        "--prefix <dir>",
        "Only include source files under this path (relative to cwd, posix; e.g. src/lib)",
    )
    .option(
        "--max-files <n>",
        "After --prefix, analyze at most this many files (lexicographic by path)",
        (v) => parseInt(v, 10),
    )
    .option(
        "--catalog-limit <n>",
        "Max files detailed in file-catalog.md (re-run without the flag for the full catalog)",
        (v) => parseInt(v, 10),
    )
    .option("--tsconfig <file>", "Path to tsconfig.json (default: <cwd>/tsconfig.json)")
    .action(async (cmdOpts: {
        prefix?: string;
        maxFiles?: number;
        catalogLimit?: number;
        tsconfig?: string;
    }) => {
        const projectRoot = process.cwd();
        const outputDir = path.join(projectRoot, ".context", "architecture");

        const maxFiles = cmdOpts.maxFiles;
        if (maxFiles !== undefined && (Number.isNaN(maxFiles) || maxFiles < 0)) {
            console.error("--max-files must be a non-negative integer");
            process.exitCode = 1;
            return;
        }

        const catalogLimit = cmdOpts.catalogLimit;
        if (catalogLimit !== undefined && (Number.isNaN(catalogLimit) || catalogLimit < 0)) {
            console.error("--catalog-limit must be a non-negative integer");
            process.exitCode = 1;
            return;
        }

        const report = await analyzeProject({
            rootDir: projectRoot,
            pathPrefix: cmdOpts.prefix,
            maxFiles: maxFiles !== undefined && !Number.isNaN(maxFiles) ? maxFiles : undefined,
            tsConfigFilePath: cmdOpts.tsconfig,
        });

        await writeReports(report, outputDir, {
            catalogLimit: catalogLimit !== undefined && !Number.isNaN(catalogLimit) ? catalogLimit : undefined,
        });

        process.stdout.write(renderArchitectureIndexMarkdown(report));
    });

await program.parseAsync(process.argv);
