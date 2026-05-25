#!/usr/bin/env node
import { glob } from "node:fs/promises";
import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { ProjectInfo } from "../../types.ts";

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
];
const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
];

const BLANK_OR_COMMENT_TS_RE = /^\s*(?:\/\/|\/\*|\*|$)/;
const BLANK_OR_COMMENT_PY_RE = /^\s*(?:#|'''|"""|$)/;

const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx|py|go|rs)$/;

function isSourceFile(name: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function shouldIgnoreDir(name: string): boolean {
  return IGNORE_DIRS.includes(name);
}

async function findSourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await Array.fromAsync(
    glob("**/*", { cwd: root }),
  );
  for (const rel of entries) {
    const base = path.basename(rel);
    if (!isSourceFile(base)) continue;
    const parts = rel.split(path.sep);
    if (parts.some(shouldIgnoreDir)) continue;
    files.push(rel);
  }
  return files.sort();
}

function countLoc(content: string, filePath: string): number {
  const isPy = filePath.endsWith(".py");
  const lines = content.split("\n");
  let count = 0;
  for (const line of lines) {
    const re = isPy ? BLANK_OR_COMMENT_PY_RE : BLANK_OR_COMMENT_TS_RE;
    if (!re.test(line)) count++;
  }
  return count;
}

function extractExports(
  content: string,
  filePath: string,
): {
  types: string[];
  functions: string[];
  classes: string[];
  constants: string[];
} {
  const ext = path.extname(filePath);
  if ([".py"].includes(ext)) {
    return extractPythonExports(content);
  }
  if ([".go"].includes(ext)) {
    return extractGoExports(content);
  }
  return extractTsExports(content);
}

function extractTsExports(content: string): {
  types: string[];
  functions: string[];
  classes: string[];
  constants: string[];
} {
  const types = new Set<string>();
  const functions = new Set<string>();
  const classes = new Set<string>();
  const constants = new Set<string>();

  let m: RegExpExecArray | null;

  const typeRe = /^(?:export\s+(?:type|interface|enum)\s+)(\w+)/gm;
  while ((m = typeRe.exec(content)) !== null) types.add(m[1]);

  const classRe = /^export\s+class\s+(\w+)/gm;
  while ((m = classRe.exec(content)) !== null) classes.add(m[1]);

  const fnRe =
    /^export\s+(?:const|function|async\s+function)\s+(\w+)\s*(?:<[^>]*>)?\s*\(/gm;
  while ((m = fnRe.exec(content)) !== null) {
    const line = content.substring(
      Math.max(0, m.index - 50),
      m.index + m[0].length + 100,
    );
    if (
      line.includes("=>") ||
      (line.includes("{") && !line.includes("function"))
    ) {
      constants.add(m[1]);
    } else {
      functions.add(m[1] + "()");
    }
  }

  const constRe = /^export\s+const\s+(\w+)\s*=\s*(?!function|async)/gm;
  while ((m = constRe.exec(content)) !== null) {
    if (!functions.has(m[1] + "()")) constants.add(m[1]);
  }

  return {
    types: [...types].sort(),
    functions: [...functions].sort(),
    classes: [...classes].sort(),
    constants: [...constants].sort(),
  };
}

function extractPythonExports(content: string): {
  types: string[];
  functions: string[];
  classes: string[];
  constants: string[];
} {
  const types = new Set<string>();
  const functions = new Set<string>();
  const classes = new Set<string>();
  const constants = new Set<string>();

  let m: RegExpExecArray | null;

  const classRe = /^class\s+(\w+)/gm;
  while ((m = classRe.exec(content)) !== null) classes.add(m[1]);

  const fnRe = /^def\s+(\w+)\s*\(/gm;
  while ((m = fnRe.exec(content)) !== null) functions.add(m[1] + "()");

  const constRe = /^(\w+)\s*=\s*(?!def|class)/gm;
  while ((m = constRe.exec(content)) !== null) {
    if (
      m[1] === m[1].toUpperCase() ||
      (!classes.has(m[1]) && !functions.has(m[1] + "()"))
    ) {
      constants.add(m[1]);
    }
  }

  return {
    types: [...types].sort(),
    functions: [...functions].sort(),
    classes: [...classes].sort(),
    constants: [...constants].sort(),
  };
}

function extractGoExports(content: string): {
  types: string[];
  functions: string[];
  classes: string[];
  constants: string[];
} {
  const types = new Set<string>();
  const functions = new Set<string>();
  const classes = new Set<string>();
  const constants = new Set<string>();

  let m: RegExpExecArray | null;

  const typeRe = /^type\s+(\w+)/gm;
  while ((m = typeRe.exec(content)) !== null) types.add(m[1]);

  const fnRe = /^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/gm;
  while ((m = fnRe.exec(content)) !== null) functions.add(m[1] + "()");

  const constRe = /^(?:const|var)\s+(\w+)/gm;
  while ((m = constRe.exec(content)) !== null) constants.add(m[1]);

  return {
    types: [...types].sort(),
    functions: [...functions].sort(),
    classes: [...classes].sort(),
    constants: [...constants].sort(),
  };
}

function extractImports(content: string, filePath: string): string[] {
  const ext = path.extname(filePath);
  const imports = new Set<string>();

  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const re = /^(?:import\s+.*?from\s+["']|import\s+["'])([^"']+)["']/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      imports.add(m[1]);
    }
  } else if (ext === ".py") {
    const re = /^(?:from\s+([\w.]+)|import\s+([\w.]+))/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      imports.add(m[1] ?? m[2]);
    }
  } else if (ext === ".go") {
    const re = /"([^"]+)"/gm;
    let m: RegExpExecArray | null;
    const lines = content.split("\n");
    let inImportBlock = false;
    for (const line of lines) {
      if (line.startsWith("import (")) {
        inImportBlock = true;
        continue;
      }
      if (inImportBlock && line.trim() === ")") {
        inImportBlock = false;
        continue;
      }
      if (inImportBlock) {
        const quoted = line.trim().match(/"([^"]+)"/);
        if (quoted) imports.add(quoted[1]);
      } else if (line.startsWith("import ")) {
        const quoted = line.match(/"([^"]+)"/);
        if (quoted) imports.add(quoted[1]);
      }
    }
  }

  return [...imports].sort();
}

function computeFanIn(
  allModules: Map<string, { imports: string[] }>,
): Map<string, number> {
  const fanIn = new Map<string, number>();
  for (const [modPath] of allModules) {
    fanIn.set(modPath, 0);
  }
  for (const modPath of allModules.keys()) {
    const normalizedBase = normalizeModulePath(modPath);
    for (const [other, { imports }] of allModules) {
      if (other === modPath) continue;
      for (const imp of imports) {
        if (importsMatch(imp, normalizedBase)) {
          fanIn.set(modPath, (fanIn.get(modPath) ?? 0) + 1);
          break;
        }
      }
    }
  }
  return fanIn;
}

function normalizeModulePath(filePath: string): string {
  const withoutExt = filePath.replace(
    /\.(ts|tsx|js|jsx|py|go|rs|java|cs)$/,
    "",
  );
  const withoutIndex = withoutExt.replace(/\/index$/, "");
  return withoutIndex;
}

function importsMatch(importPath: string, targetPath: string): boolean {
  if (importPath === targetPath) return true;
  if (importPath === "./" + targetPath) return true;
  if (importPath === "../" + targetPath) return true;

  const importNormalized = importPath.replace(/^\.?\//, "");
  const targetNormalized = targetPath.replace(/^\.?\//, "");
  if (importNormalized === targetNormalized) return true;

  if (
    targetNormalized.endsWith("/index") &&
    importNormalized === targetNormalized.replace(/\/index$/, "")
  ) {
    return true;
  }
  return false;
}

function findTestFiles(sourceFiles: string[], modulePath: string): string[] {
  const base = modulePath.replace(/\.(ts|tsx|js|jsx|py)$/, "");
  const baseName = path.basename(base);
  const dir = path.dirname(base);
  const tests: string[] = [];

  for (const sf of sourceFiles) {
    if (!TEST_FILE_RE.test(sf)) continue;
    const sfBase = sf.replace(/\.(test|spec)\.(ts|tsx|js|jsx|py)$/, "");
    if (sfBase === base || path.basename(sfBase) === baseName) {
      tests.push(sf);
    }
    if (
      dir &&
      sf.startsWith(dir + path.sep) &&
      path.basename(sfBase) === baseName
    ) {
      if (!tests.includes(sf)) tests.push(sf);
    }
  }

  return tests.sort();
}

function detectAdapterPatterns(
  modulePath: string,
  content: string,
  allSourceFiles: string[],
): { count: number; paths: string[] } {
  const baseName = path
    .basename(modulePath)
    .replace(/\.(ts|tsx|js|jsx|py)$/, "");
  const dir = path.dirname(modulePath);

  const adapterPatterns = [
    "adapter",
    "impl",
    "driver",
    "provider",
    "backend",
    "repository",
    "repo",
  ];
  const siblingFiles = allSourceFiles.filter(
    (f) => path.dirname(f) === dir && f !== modulePath,
  );

  const adapters: string[] = [];
  for (const sf of siblingFiles) {
    const sfName = path.basename(sf).toLowerCase();
    if (adapterPatterns.some((pat) => sfName.includes(pat))) {
      const relatedBase = sf
        .replace(
          /\.(adapter|impl|driver|provider|backend|repository|repo)\.(ts|tsx|js|jsx|py)$/,
          "",
        )
        .replace(/\.(ts|tsx|js|jsx|py)$/, "");
      const moduleBase = baseName.toLowerCase();
      if (
        relatedBase.toLowerCase().includes(moduleBase) ||
        moduleBase.includes(relatedBase.toLowerCase())
      ) {
        adapters.push(sf);
      }
    }
  }

  if (adapters.length > 0) {
    return { count: adapters.length, paths: adapters };
  }

  if (content.includes("implements") || content.includes("extends")) {
    const interfaceRefs =
      (content.match(/implements\s+\w+/g) ?? []).length +
      (content.match(/extends\s+\w+/g) ?? []).length;
    if (interfaceRefs > 0) {
      return { count: 1, paths: [] };
    }
  }

  return { count: 0, paths: [] };
}

async function checkTestPiercing(
  root: string,
  testFiles: string[],
): Promise<boolean> {
  for (const tf of testFiles) {
    try {
      const content = await readFile(path.join(root, tf), "utf-8");
      if (
        /__mocks__|jest\.spyOn.*private|vi\.spyOn.*private|_internal|_private/g.test(
          content,
        )
      ) {
        return true;
      }
    } catch {
      // skip
    }
  }
  return false;
}

async function readAllFiles(
  root: string,
  files: string[],
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  for (const f of files) {
    try {
      const content = await readFile(path.join(root, f), "utf-8");
      contents.set(f, content);
    } catch {
      // skip unreadable files
    }
  }
  return contents;
}

export async function runScan(args: string[]): Promise<void> {
  const targetDir = args[0] ?? process.cwd();
  const outPath =
    args[1] ?? path.join(targetDir, ".context", "architecture.json");

  console.error(`Scanning: ${targetDir}`);

  const sourceFiles = await findSourceFiles(targetDir);
  console.error(`Found ${sourceFiles.length} source files`);

  const fileContents = await readAllFiles(targetDir, sourceFiles);

  const allModules = new Map<string, { imports: string[] }>();
  for (const [f, content] of fileContents) {
    const imports = extractImports(content, f);
    allModules.set(f, { imports });
  }

  const fanInMap = computeFanIn(allModules);

  let totalLoc = 0;
  const modules: ProjectInfo["modules"] = [];

  for (const [f, content] of fileContents) {
    const loc = countLoc(content, f);
    totalLoc += loc;

    const exports_ = extractExports(content, f);
    const imports = extractImports(content, f);
    const interfaceSurface =
      exports_.types.length +
      exports_.functions.length +
      exports_.classes.length +
      exports_.constants.length;

    if (interfaceSurface === 0 && loc < 10) continue;

    const testFiles = findTestFiles(sourceFiles, f);
    const adapterInfo = detectAdapterPatterns(f, content, sourceFiles);
    const testsPierce = await checkTestPiercing(targetDir, testFiles);

    const moduleName = path
      .basename(f)
      .replace(/\.(ts|tsx|js|jsx|py|go|rs|java|cs)$/, "");

    let seamLocation = "";
    if (exports_.functions.length > 0) {
      seamLocation = exports_.functions[0] + " in " + f;
    } else if (exports_.classes.length > 0) {
      seamLocation = exports_.classes[0] + " in " + f;
    } else {
      seamLocation = f;
    }

    modules.push({
      name: moduleName,
      path: f,
      loc,
      exports: exports_,
      imports: {
        uniqueModules: imports.length,
        list: imports,
      },
      fanIn: fanInMap.get(f) ?? 0,
      fanOut: imports.length,
      adapterCount: adapterInfo.count,
      adapterPaths: adapterInfo.paths,
      seamLocation,
      testsPierceInterface: testsPierce,
      testFilePaths: testFiles,
    });
  }

  const projectName = await detectProjectName(targetDir);

  const result: ProjectInfo = {
    name: projectName,
    analyzedAt: new Date().toISOString(),
    sourceFiles: sourceFiles.length,
    totalLoc,
    modules: modules.sort((a, b) => b.loc - a.loc),
  };

  const outDir = path.dirname(outPath);
  try {
    await stat(outDir);
  } catch {
    await mkdir(outDir, { recursive: true });
  }

  await writeFile(outPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.error(`Wrote ${outPath}`);
  console.error(`  ${modules.length} modules analyzed`);
  console.error(`  ${totalLoc} total lines of code`);
}

async function detectProjectName(root: string): Promise<string> {
  const candidates = [
    path.join(root, "package.json"),
    path.join(root, "Cargo.toml"),
    path.join(root, "go.mod"),
    path.join(root, "pyproject.toml"),
    path.join(root, "pom.xml"),
  ];

  for (const p of candidates) {
    try {
      const content = await readFile(p, "utf-8");
      if (p.endsWith("package.json")) {
        return JSON.parse(content).name ?? path.basename(root);
      }
      if (p.endsWith("Cargo.toml")) {
        const m = content.match(/^\s*name\s*=\s*"([^"]+)"/m);
        return m?.[1] ?? path.basename(root);
      }
      if (p.endsWith("go.mod")) {
        const lines = content.split("\n");
        for (const line of lines) {
          if (line.startsWith("module "))
            return line.replace("module ", "").trim();
        }
      }
      if (p.endsWith("pyproject.toml")) {
        const m = content.match(/^\s*name\s*=\s*"([^"]+)"/m);
        return m?.[1] ?? path.basename(root);
      }
      return path.basename(root);
    } catch {
      continue;
    }
  }

  return path.basename(root);
}
