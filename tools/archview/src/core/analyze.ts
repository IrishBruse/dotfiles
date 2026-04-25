import { Project, SyntaxKind } from "ts-morph";
import path from "node:path";
import type { ArchitectureReport, FileArchitecture } from "./types.ts";

export async function analyzeProject(opts: {
    rootDir: string;
}): Promise<ArchitectureReport> {
    const rootResolved = path.resolve(opts.rootDir);

    const project = new Project({
        tsConfigFilePath: findTsConfigPath(opts.rootDir),
        skipAddingFilesFromTsConfig: false,
    });

    const sourceFiles = project
        .getSourceFiles()
        .filter((sf) => !sf.getFilePath().includes("node_modules"));

    const rows: Omit<FileArchitecture, "importedBy">[] = sourceFiles.map(
        (sf) => {
            const importSpecifiers = sf
                .getImportDeclarations()
                .map((imp) => imp.getModuleSpecifierValue());

            const projectImportPaths: string[] = [];
            for (const imp of sf.getImportDeclarations()) {
                const target = imp.getModuleSpecifierSourceFile();
                if (!target) continue;
                const abs = path.resolve(target.getFilePath());
                const inProject =
                    abs === rootResolved ||
                    abs.startsWith(rootResolved + path.sep);
                if (!inProject || abs.includes(`${path.sep}node_modules${path.sep}`)) {
                    continue;
                }
                projectImportPaths.push(
                    path.relative(rootResolved, abs),
                );
            }
            const uniqueProjectImports = [
                ...new Set(projectImportPaths),
            ].sort();

            const exports = Array.from(
                sf.getExportedDeclarations().keys(),
            ).sort();

            return {
                path: path.relative(rootResolved, sf.getFilePath()),
                importSpecifiers,
                projectImportPaths: uniqueProjectImports,
                exports,
            };
        },
    );

    const importedBy = new Map<string, string[]>();
    for (const row of rows) {
        for (const to of row.projectImportPaths) {
            const list = importedBy.get(to);
            if (list) {
                list.push(row.path);
            } else {
                importedBy.set(to, [row.path]);
            }
        }
    }
    for (const list of importedBy.values()) {
        list.sort();
    }

    const files: FileArchitecture[] = rows.map((row) => ({
        ...row,
        importedBy: [...(importedBy.get(row.path) ?? [])].sort(),
    }));

    const entryPoints = sourceFiles
        .filter((sf) => {
            const statements = sf.getStatements();
            return statements.some((stmt) => {
                const kind = stmt.getKind();
                return (
                    kind === SyntaxKind.ExpressionStatement ||
                    kind === SyntaxKind.CallExpression
                );
            });
        })
        .map((sf) => path.relative(rootResolved, sf.getFilePath()));

    return {
        projectRoot: rootResolved,
        analyzedAt: new Date().toISOString(),
        fileCount: sourceFiles.length,
        entryPoints,
        files,
    };
}

function findTsConfigPath(rootDir: string): string {
    return path.join(rootDir, "tsconfig.json");
}
