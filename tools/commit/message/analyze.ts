import { hintsFromAddedLines } from "./codeHints.ts";
import {
  countDiffLines,
  parseAddedLinesByFile,
  parseNameStatus
} from "../diff/parse.ts";
import type { CommitType, StagedFile, StaticCommitAnalysis } from "../types.ts";

const CONFIDENCE_THRESHOLD = 0.68;

const SKIP_SCOPE_DIRS = new Set([
  "src",
  "lib",
  "app",
  "apps",
  "packages",
  "test",
  "tests",
  "__tests__",
  "tools",
  "pkg"
]);

export function analyzeStagedChanges(
  nameStatus: string,
  diff: string
): StaticCommitAnalysis {
  const files = parseNameStatus(nameStatus);
  const addedByFile = parseAddedLinesByFile(diff);
  const lineCounts = countDiffLines(diff);

  const typeScores = new Map<CommitType, number>();
  const bump = (type: CommitType, amount: number): void => {
    typeScores.set(type, (typeScores.get(type) ?? 0) + amount);
  };

  let confidence = 0.45;
  const newSymbols: string[] = [];
  let fixSignals = 0;
  let featureSignals = 0;

  const codeFiles = files.filter((f) => isCodeFile(f.path));
  const testFiles = files.filter((f) => isTestFile(f.path));
  const docFiles = files.filter((f) => isDocFile(f.path));
  const buildFiles = files.filter((f) => isBuildFile(f.path));
  const ciFiles = files.filter((f) => isCiFile(f.path));
  const renameCount = files.filter((f) => f.status === "R").length;
  const deleteCount = files.filter((f) => f.status === "D").length;

  if (files.length === 0) {
    return emptyAnalysis();
  }

  if (testFiles.length === files.length) {
    bump("tests", 10);
    confidence += 0.28;
  } else if (testFiles.length > 0) {
    bump("tests", testFiles.length * 2);
    bump("feature", codeFiles.length);
    confidence -= 0.12;
  }

  if (docFiles.length === files.length) {
    bump("docs", 10);
    confidence += 0.3;
  } else if (docFiles.length > 0 && codeFiles.length === 0) {
    bump("docs", docFiles.length * 2);
    bump("chore", 1);
    confidence -= 0.05;
  }

  if (ciFiles.length > 0 && ciFiles.length === files.length) {
    bump("ci", 10);
    confidence += 0.28;
  }

  if (buildFiles.length > 0 && buildFiles.length === files.length) {
    bump("build", 10);
    confidence += 0.25;
  } else if (buildFiles.length > 0) {
    bump("build", buildFiles.length);
    bump("chore", 1);
    confidence -= 0.08;
  }

  if (renameCount > 0 && renameCount >= Math.ceil(files.length / 2)) {
    bump("refactor", renameCount * 2);
    confidence += 0.12;
  }

  if (deleteCount > 0 && deleteCount === files.length) {
    bump("chore", 6);
    confidence += 0.15;
  }

  for (const file of codeFiles) {
    const added = addedByFile.get(file.path) ?? [];
    const hints = hintsFromAddedLines(file.path, added);
    newSymbols.push(...hints.newSymbols);
    fixSignals += hints.fixSignals;
    featureSignals += hints.featureSignals;
    if (file.status === "A") {
      bump("feature", 2);
    } else if (file.status === "M") {
      bump("feature", 1);
      bump("fix", 1);
      bump("refactor", 1);
    }
  }

  if (fixSignals > 0) {
    bump("fix", fixSignals * 2);
    confidence += Math.min(0.12, fixSignals * 0.04);
  }

  if (featureSignals > 0 && fixSignals === 0) {
    bump("feature", featureSignals);
    confidence += Math.min(0.15, featureSignals * 0.03);
  }

  const addedFiles = files.filter((f) => f.status === "A").length;
  if (addedFiles > 0 && codeFiles.length > 0) {
    bump("feature", addedFiles * 2);
    confidence += Math.min(0.12, addedFiles * 0.04);
  }

  if (lineCounts.added + lineCounts.removed > 1200) {
    confidence -= 0.18;
  } else if (lineCounts.added + lineCounts.removed < 80) {
    confidence += 0.08;
  }

  if (files.length > 12) {
    confidence -= 0.15;
  } else if (files.length <= 3) {
    confidence += 0.08;
  }

  const distinctKinds = [
    testFiles.length > 0,
    docFiles.length > 0,
    codeFiles.length > 0,
    buildFiles.length > 0,
    ciFiles.length > 0
  ].filter(Boolean).length;
  if (distinctKinds >= 3) {
    confidence -= 0.2;
  }

  const type = pickType(typeScores, {
    deleteOnly: deleteCount === files.length,
    renameHeavy: renameCount >= Math.ceil(files.length / 2),
    hasTests: testFiles.length === files.length,
    hasDocs: docFiles.length === files.length
  });

  const scope = inferScope(files);
  if (scope !== "repo") {
    confidence += 0.1;
  } else {
    confidence -= 0.05;
  }

  const summary = buildSummary({
    type,
    scope,
    files,
    newSymbols,
    deleteCount,
    renameCount
  });

  if (summary.length < 8) {
    confidence -= 0.25;
  } else if (newSymbols.length > 0) {
    confidence += 0.1;
  }

  confidence = clamp(confidence, 0, 0.95);

  return { confidence, type, scope, summary };
}

export function isConfidentEnough(analysis: StaticCommitAnalysis): boolean {
  return analysis.confidence >= CONFIDENCE_THRESHOLD;
}

function emptyAnalysis(): StaticCommitAnalysis {
  return {
    confidence: 0,
    type: "chore",
    scope: "repo",
    summary: "update staged changes"
  };
}

function pickType(
  scores: Map<CommitType, number>,
  hints: {
    deleteOnly: boolean;
    renameHeavy: boolean;
    hasTests: boolean;
    hasDocs: boolean;
  }
): CommitType {
  if (hints.hasTests) {
    return "tests";
  }
  if (hints.hasDocs) {
    return "docs";
  }
  if (hints.deleteOnly) {
    return "chore";
  }
  if (hints.renameHeavy) {
    return "refactor";
  }

  let best: CommitType = "feature";
  let bestScore = -1;
  for (const [type, score] of scores) {
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return best;
}

function inferScope(files: StagedFile[]): string {
  const counts = new Map<string, number>();
  for (const file of files) {
    const scope = scopeFromPath(file.path);
    counts.set(scope, (counts.get(scope) ?? 0) + 1);
  }
  let best = "repo";
  let bestCount = 0;
  for (const [scope, count] of counts) {
    if (count > bestCount) {
      best = scope;
      bestCount = count;
    }
  }
  return best;
}

function scopeFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/).filter(Boolean);
  const dirs = parts.slice(0, -1);
  const meaningful = dirs.filter((d) => !SKIP_SCOPE_DIRS.has(d.toLowerCase()));
  const candidate = meaningful.at(-1) ?? dirs.at(-1) ?? stripExtension(parts.at(-1) ?? "repo");
  return sanitizeScope(candidate);
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function sanitizeScope(raw: string): string {
  const cleaned = raw
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned === "" ? "repo" : cleaned;
}

function buildSummary(input: {
  type: CommitType;
  scope: string;
  files: StagedFile[];
  newSymbols: string[];
  deleteCount: number;
  renameCount: number;
}): string {
  const uniqueSymbols = [...new Set(input.newSymbols.map(humanizeSymbol))].filter(
    (s) => s.length > 0
  );

  if (input.type === "tests") {
    if (uniqueSymbols.length > 0) {
      return `cover ${uniqueSymbols.slice(0, 2).join(" and ")}`;
    }
    return `add tests for ${input.scope}`;
  }

  if (input.type === "docs") {
    return `update ${input.scope} docs`;
  }

  if (input.type === "ci") {
    return `update ${input.scope} pipeline`;
  }

  if (input.type === "build") {
    return `update ${input.scope} build`;
  }

  if (input.renameCount > 0 && input.renameCount >= Math.ceil(input.files.length / 2)) {
    return `rename ${input.scope} modules`;
  }

  if (input.deleteCount === input.files.length) {
    return `remove ${input.scope} files`;
  }

  if (uniqueSymbols.length > 0) {
    const lead = input.type === "fix" ? "fix" : "add";
    return `${lead} ${uniqueSymbols.slice(0, 2).join(" and ")}`;
  }

  const added = input.files.filter((f) => f.status === "A").length;
  if (added > 0 && input.type === "feature") {
    return `add ${input.scope} support`;
  }

  if (input.type === "fix") {
    return `fix ${input.scope} behavior`;
  }

  if (input.type === "refactor") {
    return `refactor ${input.scope}`;
  }

  return `update ${input.scope}`;
}

function humanizeSymbol(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

function isCodeFile(path: string): boolean {
  return /\.(?:tsx?|mts|cts|cs)$/i.test(path);
}

function isTestFile(path: string): boolean {
  return (
    /(?:^|\/)(?:__tests__|tests?)(?:\/|$)/i.test(path) ||
    /\.(?:test|spec)\.[cm]?tsx?$/i.test(path) ||
    /Tests\.cs$/i.test(path) ||
    /Test\.cs$/i.test(path)
  );
}

function isDocFile(path: string): boolean {
  return /\.(?:md|mdx|rst|adoc)$/i.test(path) || /(?:^|\/)docs(?:\/|$)/i.test(path);
}

function isBuildFile(path: string): boolean {
  return (
    /(?:^|\/)(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.toml|go\.mod)$/i.test(
      path
    ) ||
    /\.(?:csproj|sln|props|targets)$/i.test(path) ||
    /(?:^|\/)(?:Dockerfile|Makefile|CMakeLists\.txt)$/i.test(path)
  );
}

function isCiFile(path: string): boolean {
  return (
    /(?:^|\/)\.github\/workflows\//i.test(path) ||
    /azure-pipelines/i.test(path) ||
    /(?:^|\/)\.gitlab-ci\.yml$/i.test(path)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
