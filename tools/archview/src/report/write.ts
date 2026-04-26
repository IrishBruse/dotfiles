import fs from "node:fs/promises";
import path from "node:path";
import type { ArchitectureReport, RenderMarkdownOpts } from "../core/types.ts";
import { ARCHVIEW_MARKDOWN_FILES, renderArchitecturePages } from "./markdown.ts";

export type WriteReportsOpts = RenderMarkdownOpts;

const LEGACY_FILES = ["architecture.md", "architecture.json", "index.md"] as const;

export async function writeReports(
    report: ArchitectureReport,
    outDir: string,
    opts: WriteReportsOpts = {},
): Promise<void> {
    await fs.mkdir(outDir, { recursive: true });

    const pages = renderArchitecturePages(report, opts);
    for (const name of ARCHVIEW_MARKDOWN_FILES) {
        await fs.writeFile(path.join(outDir, name), pages[name], "utf8");
    }

    for (const legacy of LEGACY_FILES) {
        const p = path.join(outDir, legacy);
        try {
            await fs.unlink(p);
        } catch (e) {
            const code = (e as NodeJS.ErrnoException).code;
            if (code !== "ENOENT") throw e;
        }
    }
}
