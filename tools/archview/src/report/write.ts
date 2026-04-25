import fs from "node:fs/promises";
import path from "node:path";
import type { ArchitectureReport } from "../core/types.ts";
import { renderArchitectureDocument } from "./markdown.ts";

export async function writeReports(
    report: ArchitectureReport,
    outDir: string,
): Promise<void> {
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(
        path.join(outDir, "architecture.md"),
        renderArchitectureDocument(report),
        "utf8",
    );
}
