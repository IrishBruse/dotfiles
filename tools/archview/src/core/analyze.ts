import { Project, SyntaxKind, Node } from "ts-morph";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type {
    AnalyzeProjectOpts,
    ArchitectureReport,
    FileArchitecture,
    ProjectImportKind,
    ProjectImportRef,
} from "./types.ts";
import { findCircularImportGroups, topFanIn } from "./graphMetrics.ts";

function readArchviewVersion(): string {
    const pkgPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../package.json",
    );
    try {
        const raw = fsSync.readFileSync(pkgPath, "utf8");
        const v = (JSON.parse(raw) as { version?: string }).version;
        return typeof v === "string" ? v : "0.0.0";
    } catch {
        return "0.0.0";
    }
}

function normalizeRel(p: string, root: string): string {
    const abs = path.resolve(root, p);
    return path.relative(root, abs).replace(/\\/g, "/");
}

function isUnderRoot(abs: string, rootResolved: string): boolean {
    const norm = path.normalize(abs);
    return norm === rootResolved || norm.startsWith(rootResolved + path.sep);
}

function mergeImportKinds(a: ProjectImportKind, b: ProjectImportKind): ProjectImportKind {
    const score = (k: ProjectImportKind) => (k === "type-only" ? 0 : 1);
    return score(a) >= score(b) ? a : b;
}

function mergeRefList(refs: ProjectImportRef[]): ProjectImportRef[] {
    const m = new Map<string, ProjectImportKind>();
    for (const { path: p, kind } of refs) {
        const prev = m.get(p);
        m.set(p, prev === undefined ? kind : mergeImportKinds(prev, kind));
    }
    return [...m.entries()]
        .map(([p, kind]) => ({ path: p, kind }))
        .sort((x, y) => x.path.localeCompare(y.path));
}

function findTsConfigPath(rootDir: string, override?: string): string {
    if (override) return path.resolve(override);
    return path.join(rootDir, "tsconfig.json");
}

async function readPackageJsonHints(root: string): Promise<{
    entryPaths: string[];
    isVscodeExtension: boolean;
}> {
    let pkg: Record<string, unknown>;
    try {
        const text = await fs.readFile(path.join(root, "package.json"), "utf8");
        pkg = JSON.parse(text) as Record<string, unknown>;
    } catch {
        return { entryPaths: [], isVscodeExtension: false };
    }

    const tryAdd = (rel: string | undefined, out: Set<string>) => {
        if (!rel || typeof rel !== "string") return;
        const abs = path.resolve(root, rel);
        if (!isUnderRoot(abs, path.resolve(root))) return;
        if (abs.includes(`${path.sep}node_modules${path.sep}`)) return;
        const r = path.relative(root, abs).replace(/\\/g, "/");
        if (fsSync.existsSync(abs)) out.add(r);
        const tsAlt = abs.replace(/\.jsx?$/, ".ts").replace(/\.mjs$/, ".mts");
        if (tsAlt !== abs && fsSync.existsSync(tsAlt)) {
            out.add(path.relative(root, tsAlt).replace(/\\/g, "/"));
        }
        const tsxAlt = abs.replace(/\.jsx?$/, ".tsx");
        if (tsxAlt !== abs && fsSync.existsSync(tsxAlt)) {
            out.add(path.relative(root, tsxAlt).replace(/\\/g, "/"));
        }
    };

    const entryPaths = new Set<string>();
    for (const key of ["main", "module", "types"] as const) {
        tryAdd(pkg[key] as string | undefined, entryPaths);
    }

    const walkExports = (e: unknown): void => {
        if (typeof e === "string") tryAdd(e, entryPaths);
        else if (e && typeof e === "object") {
            for (const v of Object.values(e)) walkExports(v as unknown);
        }
    };
    walkExports(pkg.exports);

    const engines = pkg.engines;
    const isVscodeExtension =
        engines !== null &&
        engines !== undefined &&
        typeof engines === "object" &&
        "vscode" in (engines as object);

    return {
        entryPaths: [...entryPaths].sort(),
        isVscodeExtension,
    };
}

function pathPrefixMatches(relPosix: string, prefix: string): boolean {
    const p = prefix.replace(/^\.?\//, "").replace(/\\/g, "/");
    if (!p) return true;
    return relPosix === p || relPosix.startsWith(`${p}/`);
}

function collectFileEdges(
    project: Project,
    sf: import("ts-morph").SourceFile,
    rootResolved: string,
    compilerOptions: ts.CompilerOptions,
    resolutionCache: ts.ModuleResolutionCache,
): { importSpecifiers: string[]; projectRefs: ProjectImportRef[] } {
    const importSpecifiers: string[] = [];
    const projectRefs: ProjectImportRef[] = [];
    const containing = sf.getFilePath();

    const pushResolved = (target: import("ts-morph").SourceFile | undefined, kind: ProjectImportKind) => {
        if (!target) return;
        const abs = path.resolve(target.getFilePath());
        if (!isUnderRoot(abs, rootResolved) || abs.includes(`${path.sep}node_modules${path.sep}`)) {
            return;
        }
        projectRefs.push({
            path: path.relative(rootResolved, abs).replace(/\\/g, "/"),
            kind,
        });
    };

    const resolveDynamic = (spec: string) => {
        const resolved = ts.resolveModuleName(
            spec,
            containing,
            compilerOptions,
            project.getModuleResolutionHost(),
            resolutionCache,
        );
        const name = resolved.resolvedModule?.resolvedFileName;
        if (!name) return;
        const abs = path.normalize(name);
        if (!isUnderRoot(abs, rootResolved) || abs.includes(`${path.sep}node_modules${path.sep}`)) {
            return;
        }
        projectRefs.push({
            path: path.relative(rootResolved, abs).replace(/\\/g, "/"),
            kind: "dynamic",
        });
    };

    for (const imp of sf.getImportDeclarations()) {
        const spec = imp.getModuleSpecifierValue();
        importSpecifiers.push(spec);
        const kind: ProjectImportKind = imp.isTypeOnly() ? "type-only" : "value";
        pushResolved(imp.getModuleSpecifierSourceFile(), kind);
    }

    for (const ed of sf.getExportDeclarations()) {
        if (!ed.hasModuleSpecifier()) continue;
        const spec = ed.getModuleSpecifierValue();
        if (spec === undefined) continue;
        importSpecifiers.push(spec);
        const kind: ProjectImportKind = ed.isTypeOnly() ? "type-only" : "re-export";
        pushResolved(ed.getModuleSpecifierSourceFile(), kind);
    }

    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const expr = call.getExpression();
        if (expr.getKind() !== SyntaxKind.ImportKeyword) continue;
        const arg0 = call.getArguments()[0];
        const spec = getStringModuleSpecifier(arg0);
        if (!spec) continue;
        importSpecifiers.push(spec);
        resolveDynamic(spec);
    }

    return { importSpecifiers, projectRefs };
}

function getStringModuleSpecifier(n: import("ts-morph").Node): string | undefined {
    if (Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n)) {
        return n.getLiteralText();
    }
    return undefined;
}

function scriptStyleEntry(sf: import("ts-morph").SourceFile): boolean {
    const statements = sf.getStatements();
    return statements.some((stmt) => {
        const kind = stmt.getKind();
        return kind === SyntaxKind.ExpressionStatement || kind === SyntaxKind.CallExpression;
    });
}

export async function analyzeProject(opts: AnalyzeProjectOpts): Promise<ArchitectureReport> {
    const rootResolved = path.resolve(opts.rootDir);
    const tsConfigPath = findTsConfigPath(opts.rootDir, opts.tsConfigFilePath);
    const archviewVersion = readArchviewVersion();

    const project = new Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: false,
    });

    const tsProgram = project.getProgram().compilerObject;
    const compilerOptions = tsProgram.getCompilerOptions() as unknown as ts.CompilerOptions;
    const resolutionCache = ts.createModuleResolutionCache(
        rootResolved,
        (f) => path.normalize(f),
        compilerOptions,
    );

    let sourceFiles = project
        .getSourceFiles()
        .filter((sf) => !sf.getFilePath().includes("node_modules"))
        .map((sf) => ({
            sf,
            rel: path.relative(rootResolved, sf.getFilePath()).replace(/\\/g, "/"),
        }))
        .filter(({ rel }) => pathPrefixMatches(rel, opts.pathPrefix ?? ""))
        .sort((a, b) => a.rel.localeCompare(b.rel));

    if (opts.maxFiles !== undefined && opts.maxFiles >= 0) {
        sourceFiles = sourceFiles.slice(0, opts.maxFiles);
    }

    const sourceSet = new Set(sourceFiles.map((x) => x.rel));
    const { entryPaths: pkgEntries, isVscodeExtension } = await readPackageJsonHints(rootResolved);
    const packageJsonEntryPaths = pkgEntries.filter((p) => sourceSet.has(p));

    const rows: Omit<FileArchitecture, "importedBy">[] = sourceFiles.map(({ sf, rel }) => {
        const { importSpecifiers, projectRefs } = collectFileEdges(
            project,
            sf,
            rootResolved,
            compilerOptions,
            resolutionCache,
        );
        const mergedRefs = mergeRefList(projectRefs).filter((r) => sourceSet.has(r.path));
        const projectImportPaths = mergedRefs.map((r) => r.path);

        const exports = Array.from(sf.getExportedDeclarations().keys()).sort();

        return {
            path: rel,
            importSpecifiers,
            projectImportPaths,
            projectImports: mergedRefs,
            exports,
        };
    });

    const importedBy = new Map<string, string[]>();
    for (const row of rows) {
        for (const to of row.projectImportPaths) {
            const list = importedBy.get(to);
            if (list) list.push(row.path);
            else importedBy.set(to, [row.path]);
        }
    }
    for (const list of importedBy.values()) {
        list.sort();
    }

    const files: FileArchitecture[] = rows.map((row) => ({
        ...row,
        importedBy: [...(importedBy.get(row.path) ?? [])].sort(),
    }));

    const scriptHeuristic = sourceFiles
        .filter(({ sf }) => scriptStyleEntry(sf))
        .map(({ rel }) => rel);

    const vscodeActivate = isVscodeExtension
        ? sourceFiles
              .filter(({ sf }) => [...sf.getExportedDeclarations().keys()].includes("activate"))
              .map(({ rel }) => rel)
        : [];

    const entryPoints = [
        ...new Set([
            ...packageJsonEntryPaths,
            ...vscodeActivate,
            ...scriptHeuristic,
        ]),
    ].sort();
    const entrySet = new Set(entryPoints);

    const filesWithNoIncomingImports = files
        .filter((f) => f.importedBy.length === 0)
        .map((f) => f.path)
        .sort();

    const orphanCandidates = filesWithNoIncomingImports.filter((p) => !entrySet.has(p));

    const edgeCount = files.reduce((n, f) => n + f.projectImportPaths.length, 0);
    const circularImportGroups = findCircularImportGroups(files);
    const fanIn = topFanIn(files, 8);

    return {
        projectRoot: rootResolved,
        tsConfigPath,
        archviewVersion,
        analyzedAt: new Date().toISOString(),
        fileCount: files.length,
        edgeCount,
        entryPoints,
        packageJsonEntryPaths,
        filesWithNoIncomingImports,
        orphanCandidates,
        circularImportGroups,
        topFanIn: fanIn,
        files,
    };
}
