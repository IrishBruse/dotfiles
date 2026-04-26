import path from "node:path";
import { isBuiltin } from "node:module";
import type { ArchitectureReport, FileArchitecture, RenderMarkdownOpts } from "../core/types.ts";

function displayPath(projectRoot: string, absPath: string): string {
    const rel = path.relative(projectRoot, absPath).replace(/\\/g, "/");
    return rel.startsWith("..") ? absPath : rel;
}

const MAX_EDGE_LINES = 500;
const MAX_INLINE_EXPORTS = 12;

/** Topic markdown files written under `.context/architecture/` (index is stdout only). */
export const ARCHVIEW_MARKDOWN_FILES = [
    "overview.md",
    "external-packages.md",
    "entrypoints.md",
    "roots-and-orphans.md",
    "graph-metrics.md",
    "import-edges.md",
    "file-catalog.md",
] as const;

export type ArchviewMarkdownFile = (typeof ARCHVIEW_MARKDOWN_FILES)[number];

type ExternalBuckets = {
    nodeColon: string[];
    nodeBuiltins: string[];
    npmPackages: string[];
};

function topLevelName(spec: string): string {
    return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : (spec.split("/")[0] ?? spec);
}

function collectExternalBuckets(files: FileArchitecture[]): ExternalBuckets {
    const nodeColon = new Set<string>();
    const nodeBuiltins = new Set<string>();
    const npm = new Set<string>();

    for (const f of files) {
        for (const spec of f.importSpecifiers) {
            if (spec.startsWith(".") || spec.startsWith("/")) continue;
            if (spec.startsWith("node:")) {
                nodeColon.add(spec);
                continue;
            }
            const top = topLevelName(spec);
            if (!top) continue;
            if (isBuiltin(top)) {
                nodeBuiltins.add(top);
            } else {
                npm.add(top);
            }
        }
    }

    return {
        nodeColon: [...nodeColon].sort(),
        nodeBuiltins: [...nodeBuiltins].sort(),
        npmPackages: [...npm].sort(),
    };
}

function renderAtAGlance(report: ArchitectureReport, buckets: ExternalBuckets): string {
    const internalEdges = report.edgeCount;
    const extTotal =
        buckets.nodeColon.length + buckets.nodeBuiltins.length + buckets.npmPackages.length;
    const lines = [
        "## At a glance",
        "",
        "| | |",
        "| --- | --- |",
        `| Project root | \`${report.projectRoot}\` |`,
        `| tsconfig | \`${displayPath(report.projectRoot, report.tsConfigPath)}\` |`,
        `| Analyzed (UTC) | \`${report.analyzedAt}\` |`,
        `| archview | \`${report.archviewVersion}\` |`,
        `| Source files | ${report.fileCount} |`,
        `| Internal import edges | ${internalEdges} |`,
        `| Distinct externals (grouped below) | ${extTotal} |`,
        `| Candidate entrypoints | ${report.entryPoints.length} |`,
        `| Files with no incoming project imports | ${report.filesWithNoIncomingImports.length} |`,
        `| Orphan candidates (no importers, not an entrypoint) | ${report.orphanCandidates.length} |`,
        `| Circular import groups (SCC > 1 file) | ${report.circularImportGroups.length} |`,
        "",
    ];
    return lines.join("\n");
}

function renderHowToRead(): string {
    return [
        "## How to read these documents",
        "",
        "Running **`archview analyze`** prints a short **stdout** guide to which files here to open (not written to disk).",
        "",
        "File paths in tables and lists use Markdown code spans.",
        "",
        "**Entrypoints** merge `package.json` entry fields (when they point at analyzed files), VS Code-style `activate` exports when `engines.vscode` is set, and a small script-style top-level statement heuristic.",
        "",
        "**Project imports** are resolved via the TypeScript program; **import specifiers** are raw strings from source (including `export … from` and `import()` where resolved). The file catalog notes **type-only** edges when present.",
        "",
    ].join("\n");
}

function renderExternalPackagesBody(b: ExternalBuckets): string {
    const lines: string[] = [];
    const any = b.nodeColon.length + b.nodeBuiltins.length + b.npmPackages.length > 0;
    if (!any) {
        lines.push("*None detected from import / export / dynamic specifiers (only relative paths or empty).*");
        return `${lines.join("\n")}\n`;
    }

    if (b.nodeColon.length) {
        lines.push("### `node:` built-ins");
        lines.push("");
        for (const p of b.nodeColon) {
            lines.push(`- \`${p}\``);
        }
        lines.push("");
    }
    if (b.nodeBuiltins.length) {
        lines.push("### Node built-in modules (bare specifier)");
        lines.push("");
        for (const p of b.nodeBuiltins) {
            lines.push(`- \`${p}\``);
        }
        lines.push("");
    }
    if (b.npmPackages.length) {
        lines.push("### npm and other packages");
        lines.push("");
        for (const p of b.npmPackages) {
            lines.push(`- \`${p}\``);
        }
        lines.push("");
    }
    return `${lines.join("\n").trimEnd()}\n`;
}

function renderEntryPointsBody(report: ArchitectureReport): string {
    const lines: string[] = [
        "Merged from **package.json** (`main` / `module` / `types` / `exports`), **VS Code `activate` export** when `engines.vscode` is present, and **script-style** top-level expression or call statements.",
        "",
    ];
    if (report.entryPoints.length === 0) {
        lines.push("*None detected.*");
    } else {
        for (const ep of report.entryPoints) {
            lines.push(`- \`${ep}\``);
        }
    }
    if (report.packageJsonEntryPaths.length) {
        lines.push("");
        lines.push("From **package.json** only:");
        lines.push("");
        for (const p of report.packageJsonEntryPaths) {
            lines.push(`- \`${p}\``);
        }
    }
    return `${lines.join("\n")}\n`;
}

function renderNoIncomingBody(report: ArchitectureReport): string {
    const lines = [
        "These files are not targeted by any resolved internal `import`, `export … from`, or `import()` edge. Extension entry files often appear here together with unused modules.",
        "",
    ];
    if (report.filesWithNoIncomingImports.length === 0) {
        lines.push("*None.*");
    } else {
        for (const p of report.filesWithNoIncomingImports) {
            lines.push(`- \`${p}\``);
        }
    }
    return `${lines.join("\n")}\n`;
}

function renderOrphanCandidatesBody(report: ArchitectureReport): string {
    const lines = [
        "Subset of **no incoming project imports** and **not** listed as a merged entrypoint (more likely unused or forgotten).",
        "",
    ];
    if (report.orphanCandidates.length === 0) {
        lines.push("*None.*");
    } else {
        for (const p of report.orphanCandidates) {
            lines.push(`- \`${p}\``);
        }
    }
    return `${lines.join("\n")}\n`;
}

function renderCyclesBody(report: ArchitectureReport): string {
    const lines = [
        "Strongly connected components with more than one file (mutual reachability in the internal graph).",
        "",
    ];
    if (report.circularImportGroups.length === 0) {
        lines.push("*None.*");
    } else {
        for (const g of report.circularImportGroups) {
            lines.push(`- ${g.map((p) => `\`${p}\``).join(" ↔ ")}`);
        }
    }
    return `${lines.join("\n")}\n`;
}

function renderFanInBody(report: ArchitectureReport): string {
    const lines: string[] = [];
    if (report.topFanIn.length === 0 || report.topFanIn.every((x) => x.count === 0)) {
        lines.push("*No incoming edges in this graph.*");
    } else {
        lines.push("| File | Incoming count |");
        lines.push("| --- | ---: |");
        for (const { path: p, count } of report.topFanIn) {
            if (count === 0) break;
            lines.push(`| \`${p}\` | ${count} |`);
        }
    }
    return `${lines.join("\n")}\n`;
}

function renderEdgesBody(report: ArchitectureReport): string {
    const edges: string[] = [];
    for (const f of report.files) {
        for (const to of f.projectImportPaths) {
            edges.push(`- \`${f.path}\` → \`${to}\``);
        }
    }
    edges.sort();

    const lines: string[] = [];
    if (edges.length === 0) {
        lines.push("*No project-to-project imports resolved.*");
        return `${lines.join("\n")}\n`;
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
            `*… ${edges.length - MAX_EDGE_LINES} more edges omitted. Narrow scope (\`--prefix\`) or split the project to review the rest.*`,
        );
    }
    return `${lines.join("\n")}\n`;
}

function formatExports(exports: string[]): string {
    if (exports.length === 0) return "—";
    if (exports.length <= MAX_INLINE_EXPORTS) {
        return exports.map((e) => `\`${e}\``).join(", ");
    }
    const head = exports.slice(0, MAX_INLINE_EXPORTS).map((e) => `\`${e}\``).join(", ");
    const rest = exports.length - MAX_INLINE_EXPORTS;
    return `${head} *(+${rest} more)*`;
}

function renderFileSection(f: FileArchitecture): string {
    const typeOnlyTargets = f.projectImports
        .filter((r) => r.kind === "type-only")
        .map((r) => r.path);
    const kindNote =
        typeOnlyTargets.length > 0
            ? `Type-only links to: ${typeOnlyTargets.map((p) => `\`${p}\``).join(", ")}`
            : "";

    const lines: string[] = [
        `### \`${f.path}\``,
        "",
        `- **Exports** (${f.exports.length}): ${f.exports.length ? formatExports(f.exports) : "—"}`,
        `- **Project imports** (${f.projectImportPaths.length}): ${f.projectImportPaths.length ? f.projectImportPaths.map((p) => `\`${p}\``).join(", ") : "—"}`,
        `- **Imported by** (${f.importedBy.length}): ${f.importedBy.length ? f.importedBy.map((p) => `\`${p}\``).join(", ") : "—"}`,
        "",
    ];
    if (kindNote) {
        lines.push(kindNote);
        lines.push("");
    }

    lines.push("#### Import specifiers (raw)", "");

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

function renderFileCatalogBody(report: ArchitectureReport, opts: RenderMarkdownOpts): string {
    const sorted = [...report.files].sort((a, b) => a.path.localeCompare(b.path));
    const limit = opts.catalogLimit;
    const capped = limit !== undefined && limit >= 0 ? sorted.slice(0, limit) : sorted;
    const omitted = limit !== undefined && sorted.length > capped.length ? sorted.length - capped.length : 0;

    const lines = [
        "One subsection per source file: exports, resolved project imports, reverse links, raw specifiers, and type-only link notes when relevant.",
        "",
    ];
    if (omitted > 0) {
        lines.push(
            `*Showing **${capped.length}** of **${sorted.length}** files (see \`--catalog-limit\`). Re-run without that flag for the full catalog.*`,
        );
        lines.push("");
    }
    for (const f of capped) {
        lines.push(renderFileSection(f));
    }
    return `${lines.join("\n")}\n`;
}

function ensureTrailingNewline(s: string): string {
    return s.endsWith("\n") ? s : `${s}\n`;
}

/** Short stdout guide: which `.context/architecture/*.md` files to read (not written to disk). */
export function renderArchitectureIndexMarkdown(report: ArchitectureReport): string {
    const tsRel = displayPath(report.projectRoot, report.tsConfigPath);
    const sections: [string, string][] = [
        ["Scope, counts, conventions", "`.context/architecture/overview.md`"],
        ["External imports (`node:`, builtins, npm)", "`.context/architecture/external-packages.md`"],
        ["Candidate entrypoints", "`.context/architecture/entrypoints.md`"],
        ["No incoming imports; orphan candidates", "`.context/architecture/roots-and-orphans.md`"],
        ["Import cycles; fan-in", "`.context/architecture/graph-metrics.md`"],
        ["All internal import edges", "`.context/architecture/import-edges.md`"],
        ["Per-file exports, imports, specifiers", "`.context/architecture/file-catalog.md`"],
    ];
    const toc = sections
        .map(([title, p]) => `## ${title}\n\n${p}\n`)
        .join("\n");

    const body = [
        "# Architecture (archview)",
        "",
        `Topic pages: **\`.context/architecture/\`** (from project \`${report.projectRoot}\`, tsconfig \`${tsRel}\`).`,
        "",
        `**${report.fileCount}** source files, **${report.edgeCount}** internal edges.`,
        "",
        toc,
    ].join("\n");
    return ensureTrailingNewline(body);
}

function renderOverviewPage(report: ArchitectureReport, buckets: ExternalBuckets): string {
    const body = [
        "# Overview",
        "",
        renderAtAGlance(report, buckets),
        renderHowToRead(),
    ].join("\n");
    return ensureTrailingNewline(body);
}

/** All markdown pages for `.context/architecture/`. */
export function renderArchitecturePages(
    report: ArchitectureReport,
    opts: RenderMarkdownOpts = {},
): Record<ArchviewMarkdownFile, string> {
    const buckets = collectExternalBuckets(report.files);
    return {
        "overview.md": renderOverviewPage(report, buckets),
        "external-packages.md": ensureTrailingNewline(
            ["# External packages", "", renderExternalPackagesBody(buckets).trimEnd(), ""].join("\n"),
        ),
        "entrypoints.md": ensureTrailingNewline(
            ["# Candidate entrypoints", "", renderEntryPointsBody(report).trimEnd(), ""].join("\n"),
        ),
        "roots-and-orphans.md": ensureTrailingNewline(
            [
                "# Roots and orphans",
                "",
                "## Files with no incoming project imports",
                "",
                renderNoIncomingBody(report).trimEnd(),
                "",
                "## Orphan candidates",
                "",
                renderOrphanCandidatesBody(report).trimEnd(),
                "",
            ].join("\n"),
        ),
        "graph-metrics.md": ensureTrailingNewline(
            [
                "# Graph metrics",
                "",
                "## Circular import groups",
                "",
                renderCyclesBody(report).trimEnd(),
                "",
                "## Highest fan-in (imported by many files)",
                "",
                renderFanInBody(report).trimEnd(),
                "",
            ].join("\n"),
        ),
        "import-edges.md": ensureTrailingNewline(
            ["# Internal import edges", "", renderEdgesBody(report).trimEnd(), ""].join("\n"),
        ),
        "file-catalog.md": ensureTrailingNewline(
            ["# File catalog", "", renderFileCatalogBody(report, opts).trimEnd(), ""].join("\n"),
        ),
    };
}
