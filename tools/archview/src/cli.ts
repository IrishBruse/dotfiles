#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { analyzeProject } from "./core/analyze.ts";
import { writeReports } from "./report/write.ts";

const program = new Command();

program
    .name("archview")
    .description("Static architecture analysis for TypeScript projects")
    .version("0.1.0");

program.command("analyze").action(async () => {
    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, ".context", "architecture");

    console.log(`Analyzing project at: ${projectRoot}`);

    const report = await analyzeProject({ rootDir: projectRoot });
    await writeReports(report, outputDir);

    console.log(`Wrote ${path.join(outputDir, "architecture.md")}`);
});

await program.parseAsync(process.argv);
