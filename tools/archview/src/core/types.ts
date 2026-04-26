/** How this file links to another project file (for forward imports). */
export type ProjectImportKind =
    | "value"
    | "type-only"
    | "re-export"
    | "dynamic";

export type ProjectImportRef = {
    path: string;
    kind: ProjectImportKind;
};

export type FileArchitecture = {
    path: string;
    /** Raw module specifier strings from imports, export…from, and dynamic import() */
    importSpecifiers: string[];
    /** Deduped sorted targets (union of all link kinds) */
    projectImportPaths: string[];
    /** Forward edges with kind (one row per target after merge) */
    projectImports: ProjectImportRef[];
    exports: string[];
    /** Project files that import (or re-export) this file */
    importedBy: string[];
};

export type FanInEntry = {
    path: string;
    count: number;
};

export type ArchitectureReport = {
    projectRoot: string;
    /** Absolute path to tsconfig used */
    tsConfigPath: string;
    archviewVersion: string;
    analyzedAt: string;
    fileCount: number;
    /** Sum of per-file out-degree (unique targets per file) */
    edgeCount: number;
    /** Merged: package.json hints, VS Code activate, script heuristic */
    entryPoints: string[];
    /** Paths taken from package.json main/module/types/exports (filtered to analyzed files) */
    packageJsonEntryPaths: string[];
    /** Files with no incoming project links (includes real entries and unused files) */
    filesWithNoIncomingImports: string[];
    /** Subset of no-incoming not listed as entrypoints */
    orphanCandidates: string[];
    /** SCCs with more than one file (circular dependency groups), each sorted */
    circularImportGroups: string[][];
    topFanIn: FanInEntry[];
    files: FileArchitecture[];
};

export type AnalyzeProjectOpts = {
    rootDir: string;
    /** Only include source files whose relative path starts with this (posix, no leading `./`) */
    pathPrefix?: string;
    /** After filters, keep at most this many files (lexicographic by path) */
    maxFiles?: number;
    /** Override default `<root>/tsconfig.json` */
    tsConfigFilePath?: string;
};

export type RenderMarkdownOpts = {
    /** If set, only this many files appear in the file catalog (rest only in JSON) */
    catalogLimit?: number;
};
