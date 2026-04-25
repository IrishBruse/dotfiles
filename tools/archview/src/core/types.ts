export type FileArchitecture = {
    path: string;
    /** Raw module specifier strings from import declarations */
    importSpecifiers: string[];
    /** Other project source files this file imports (relative paths from project root) */
    projectImportPaths: string[];
    exports: string[];
    /** Project files that import this file */
    importedBy: string[];
};

export type ArchitectureReport = {
    projectRoot: string;
    analyzedAt: string;
    fileCount: number;
    entryPoints: string[];
    files: FileArchitecture[];
};
