import type { ArchitectureReport, FileArchitecture } from "../core/types.ts";

const DOC_VERSION = "1";

const MAX_EDGE_LINES = 500;

function yamlScalar(s: string): string {
    return JSON.stringify(s);
}

function yamlStringList(indent: string, items: string[]): string {
    if (items.length === 0) {
        return "[]";
    }
    return `\n${items.map((i) => `${indent}- ${yamlScalar(i)}`).join("\n")}`;
}

function collectExternalPackages(files: FileArchitecture[]): string[] {
    const set = new Set<string>();
    for (const f of files) {
        for (const spec of f.importSpecifiers) {
            if (spec.startsWith("node:")) continue;
            if (spec.startsWith(".") || spec.startsWith("/")) continue;
            const pkg = spec.startsWith("@")
                ? spec.split("/").slice(0, 2).join("/")
                : spec.split("/")[0];
            if (pkg) set.add(pkg);
        }
    }
    return [...set].sort();
}

function renderFrontmatter(report: ArchitectureReport): string {
    const ep = yamlStringList("  ", report.entryPoints);
    const lines = [
        "---",
        `archview_format: ${yamlScalar(DOC_VERSION)}`,
        `project_root: ${yamlScalar(report.projectRoot)}`,
        `analyzed_at: ${yamlScalar(report.analyzedAt)}`,
        `file_count: ${report.fileCount}`,
        `entry_points:${ep === "[]" ? " []" : ep}`,
        "---",
    ];
    return lines.join("\n");
}

function renderAtAGlance(report: ArchitectureReport, externals: string[]): string {
    const internalEdges = report.files.reduce(
        (n, f) => n + f.projectImportPaths.length,
        0,
    );
    const lines = [
        "## At a glance",
        "",
        "| | |",
        "| --- | --- |",
        `| Project root | \`${report.projectRoot}\` |`,
        `| Analyzed (UTC) | \`${report.analyzedAt}\` |`,
        `| Source files | ${report.fileCount} |`,
        `| Internal import edges | ${internalEdges} |`,
        `| Distinct external packages | ${externals.length} |`,
        `| Candidate entrypoints (heuristic) | ${report.entryPoints.length} |`,
        "",
    ];
    return lines.join("\n");
}

function renderHowToRead(): string {
    return [
        "## How to read this document",
        "",
        "The **YAML frontmatter** is stable metadata for tools and agents (paths, counts, entrypoint list).",
        "",
        "Sections below are written for humans first; headings and tables stay consistent so agents can skim by `##` and file paths in `` `backticks` ``.",
        "",
        "Heuristic **entrypoints** flag files whose top-level statements look like executable scripts (not a guarantee of runtime entry).",
        "",
        "**Project imports** are resolved through the TypeScript program; **import specifiers** are the raw strings from source.",
        "",
    ].join("\n");
}

function renderExternalPackages(externals: string[]): string {
    const lines = ["## External packages", ""];
    if (externals.length === 0) {
        lines.push("*None detected from import specifiers (only relative / `node:` / empty).*");
    } else {
        lines.push("Top-level package names inferred from `import` / `export … from` specifiers:");
        lines.push("");
        for (const p of externals) {
            lines.push(`- \`${p}\``);
        }
    }
    lines.push("");
    return lines.join("\n");
}

function renderEntryPoints(report: ArchitectureReport): string {
    const lines = ["## Candidate entrypoints", ""];
    if (report.entryPoints.length === 0) {
        lines.push("*None matched the simple top-level statement heuristic.*");
    } else {
        for (const ep of report.entryPoints) {
            lines.push(`- \`${ep}\``);
        }
    }
    lines.push("");
    return lines.join("\n");
}

function renderEdges(report: ArchitectureReport): string {
    const edges: string[] = [];
    for (const f of report.files) {
        for (const to of f.projectImportPaths) {
            edges.push(`- \`${f.path}\` → \`${to}\``);
        }
    }
    edges.sort();

    const lines = ["## Internal import edges", ""];
    if (edges.length === 0) {
        lines.push("*No project-to-project imports resolved.*");
        lines.push("");
        return lines.join("\n");
    }

    const truncated = edges.length > MAX_EDGE_LINES;
    const shown = truncated ? edges.slice(0, MAX_EDGE_LINES) : edges;
    lines.push(
        truncated
            ? `Showing first **${MAX_EDGE_LINES}** of **${edges.length}** edges (lexicographic order):`
            : `**${edges.length}** edges (lexicographic order):`,
    );
    lines.push("");
    lines.push(...shown);
    if (truncated) {
        lines.push("");
        lines.push(
            `*… ${edges.length - MAX_EDGE_LINES} more edges omitted. Narrow scope or split the project to review the rest.*`,
        );
    }
    lines.push("");
    return lines.join("\n");
}

function renderFileSection(f: FileArchitecture): string {
    const lines: string[] = [
        `### \`${f.path}\``,
        "",
        "| | |",
        "| --- | --- |",
        `| Exports (${f.exports.length}) | ${f.exports.length ? f.exports.map((e) => `\`${e}\``).join(", ") : "—"} |`,
        `| Project imports (${f.projectImportPaths.length}) | ${f.projectImportPaths.length ? f.projectImportPaths.map((p) => `\`${p}\``).join(", ") : "—"} |`,
        `| Imported by (${f.importedBy.length}) | ${f.importedBy.length ? f.importedBy.map((p) => `\`${p}\``).join(", ") : "—"} |`,
        "",
        "#### Import specifiers (raw)",
        "",
    ];
    if (f.importSpecifiers.length === 0) {
        lines.push("*None.*");
    } else {
        const deduped = [...new Set(f.importSpecifiers)].sort();
        for (const s of deduped) {
            lines.push(`- \`${s}\``);
        }
    }
    lines.push("");
    return lines.join("\n");
}

function renderFileCatalog(report: ArchitectureReport): string {
    const sorted = [...report.files].sort((a, b) =>
        a.path.localeCompare(b.path),
    );
    const lines = [
        "## File catalog",
        "",
        "One subsection per source file: exports, resolved project imports, reverse links, then raw specifiers.",
        "",
    ];
    for (const f of sorted) {
        lines.push(renderFileSection(f));
    }
    return lines.join("\n");
}

/** Single unified report: YAML frontmatter + markdown body (users and agents). */
export function renderArchitectureDocument(report: ArchitectureReport): string {
    const externals = collectExternalPackages(report.files);
    const body = [
        renderFrontmatter(report),
        "",
        "# Architecture report",
        "",
        "> Generated by **archview** — TypeScript static overview (imports / exports / internal graph).",
        "",
        renderAtAGlance(report, externals),
        renderHowToRead(),
        renderExternalPackages(externals),
        renderEntryPoints(report),
        renderEdges(report),
        renderFileCatalog(report),
    ].join("\n");
    return body.endsWith("\n") ? body : `${body}\n`;
}
