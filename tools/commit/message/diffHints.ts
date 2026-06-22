import { basename } from "node:path";

import {
  parseAddedLinesByFile,
  parseRemovedLinesByFile
} from "../diff/parse.ts";
import type { CommitType, StagedFile } from "../types.ts";

export interface DiffHints {
  summaries: string[];
  typeHint?: CommitType;
}

const STRING_LITERAL =
  /["'`]([^"'`]{3,80})["'`]/g;

const MAX_CONST_REMOVED = /^-\s*const\s+(MAX_\w+)/;
const THROW_REMOVED = /^-\s*throw\s+new\s+Error/;
const KEY_HANDLER = /key\.name\s*===\s*["'](\w+)["']/;
const HELP_SHORTCUT = /\b([a-z]):\s+(\w+)/gi;
const MDC_HEADING = /^#+\s+(.+)$/;
const IMPORT_ADDED = /^\+\s*import\s+/;
const IMPORT_REMOVED = /^-\s*import\s+/;
const MIGRATE_FN = /migrate[A-Z]\w*/;
const OPEN_PATH_FN = /openPath|xdg-open/;

const SKIP_STRINGS = new Set([
  "",
  "use strict",
  "node:fs",
  "node:path",
  "node:process",
  "node:fs/promises",
  "node:readline",
  "node:child_process",
  "node:os",
  "\x1b[0m",
  "\x1b[1m",
  "\x1b[2m",
  "\x1b[36m",
  "\x1b[7m"
]);

const KNOWN_FILE_LABELS: Record<string, string> = {
  "interactive.ts": "interactive UI",
  "main.ts": "CLI entry",
  "partial.ts": "partial folder flow"
};

/**
 * Extract behavioral commit-summary hints from added and removed diff lines.
 */
export function hintsFromDiff(
  diff: string,
  files: StagedFile[]
): DiffHints {
  const addedByFile = parseAddedLinesByFile(diff);
  const removedByFile = parseRemovedLinesByFile(diff);
  const summaries: string[] = [];
  let typeHint: CommitType | undefined;

  for (const file of files) {
    const added = addedByFile.get(file.path) ?? [];
    const removed = removedByFile.get(file.path) ?? [];
    const path = file.path;

    if (isMarkdownFile(path)) {
      const heading = summarizeMarkdownHeadings(added, path);
      if (heading !== "") {
        summaries.push(heading);
      }
      continue;
    }

    if (!isCodeFile(path)) {
      continue;
    }

    const shortcut = summarizeShortcutChange(added, removed);
    if (shortcut !== "") {
      summaries.push(shortcut);
    }

    const validation = summarizeRemovedValidation(removed, added);
    if (validation !== "") {
      summaries.push(validation);
    }

    const migration = summarizeMigration(added, removed);
    if (migration !== "") {
      summaries.push(migration);
    }

    const keyConfirm = summarizeKeyConfirmChange(added, removed);
    if (keyConfirm !== "") {
      summaries.push(keyConfirm);
    }

    const label = summarizeStringLabelChange(added, removed);
    if (label !== "") {
      summaries.push(label);
    }

    const importSummary = summarizeImportChurn(added, removed);
    if (importSummary !== "") {
      summaries.push(importSummary);
      typeHint = "refactor";
    }

    const flow = summarizeFlowAddition(path, added, removed);
    if (flow !== "") {
      summaries.push(flow);
    }
  }

  return { summaries: rankSummaries(summaries), typeHint };
}

/**
 * Pick the best diff-hint phrase for a commit summary, or empty when none apply.
 */
export function bestDiffHintSummary(
  diff: string,
  files: StagedFile[],
  scope: string
): string {
  const { summaries } = hintsFromDiff(diff, files);
  for (const summary of summaries) {
    if (!isScopeEcho(summary, scope)) {
      return summary;
    }
  }
  return summaries[0] ?? "";
}

/**
 * Fallback summary from changed file basenames when diff hints are absent.
 */
export function fileBasenameSummary(files: StagedFile[]): string {
  if (files.length === 0) {
    return "";
  }
  const addedSummary = summarizeAddedFiles(files);
  if (addedSummary !== "") {
    return addedSummary;
  }
  const labels = files.map((f) => fileLabel(f.path));
  const unique = [...new Set(labels)];
  if (unique.length === 1) {
    return `update ${unique[0]!}`;
  }
  return `update ${unique.slice(0, 2).join(" and ")}`;
}

export function isScopeEcho(summary: string, scope: string): boolean {
  const normalized = summary.trim().toLowerCase();
  const scopeLower = scope.toLowerCase();
  if (normalized === scopeLower) {
    return true;
  }
  if (normalized === `improve ${scopeLower}` || normalized === `update ${scopeLower}`) {
    return true;
  }
  if (normalized === `fix ${scopeLower} behavior`) {
    return true;
  }
  if (normalized === `refactor ${scopeLower}`) {
    return true;
  }
  if (normalized === `add ${scopeLower} support`) {
    return true;
  }
  return false;
}

export function isGenericSummary(summary: string): boolean {
  const s = summary.trim().toLowerCase();
  if (s === "") {
    return true;
  }
  if (/^(improve|update|refactor|fix) \w+$/.test(s)) {
    return true;
  }
  if (/^add \w+ support$/.test(s)) {
    return true;
  }
  if (/^fix \w+ behavior$/.test(s)) {
    return true;
  }
  return false;
}

function summarizeMarkdownHeadings(added: string[], path: string): string {
  const headings: string[] = [];
  for (const line of added) {
    const match = line.match(MDC_HEADING);
    if (match?.[1]) {
      headings.push(match[1].trim());
    }
  }
  if (headings.length === 0) {
    return "";
  }
  if (headings.length >= 3) {
    const topic = inferDocTopic(headings, path);
    return `document ${topic} workflow`;
  }
  const section = headings[0]!
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return `add ${section} section`;
}

function inferDocTopic(headings: string[], path: string): string {
  if (/memory/i.test(path)) {
    return "memory CLI";
  }
  const joined = headings.join(" ").toLowerCase();
  if (joined.includes("memory")) {
    return "memory CLI";
  }
  if (joined.includes("agent")) {
    return "agent";
  }
  return "rule";
}

function summarizeShortcutChange(added: string[], removed: string[]): string {
  if (added.some((l) => OPEN_PATH_FN.test(l))) {
    return "add open shortcut in interactive UI";
  }

  const addedHelp = added.filter((l) => /HELP_|help/i.test(l) && /:\s*\w+/.test(l));
  const removedHelp = removed.filter((l) => /HELP_|help/i.test(l) && /:\s*\w+/.test(l));
  if (addedHelp.length === 0) {
    return "";
  }

  const addedKeys = new Set(extractHelpShortcuts(addedHelp.join("\n")));
  const removedKeys = new Set(extractHelpShortcuts(removedHelp.join("\n")));
  for (const key of addedKeys) {
    if (!removedKeys.has(key) && key.endsWith(":open")) {
      return "add open shortcut in interactive UI";
    }
  }

  return "";
}

function extractHelpShortcuts(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(HELP_SHORTCUT)) {
    const key = match[1];
    const action = match[2];
    if (key && action && action.length > 1) {
      keys.push(`${key}:${action}`);
    }
  }
  return keys;
}

function summarizeRemovedValidation(
  removed: string[],
  added: string[]
): string {
  for (const line of removed) {
    if (MAX_CONST_REMOVED.test(line)) {
      const topic = inferLimitTopic(removed, added);
      return topic !== "" ? `drop ${topic}` : "drop validation limit";
    }
    if (THROW_REMOVED.test(line) && /words|limit|max|at most/i.test(line)) {
      return "drop validation limit";
    }
  }

  const removedGuards = removed.filter((l) =>
    /if\s*\([^)]+\)\s*\{?\s*$/.test(l) || /throw new Error/.test(l)
  );
  const addedGuards = added.filter((l) =>
    /if\s*\([^)]+\)\s*\{?\s*$/.test(l) || /throw new Error/.test(l)
  );
  if (removedGuards.length > addedGuards.length && removed.some((l) => /slug|word/i.test(l))) {
    return "drop slug word limit";
  }

  return "";
}

function inferLimitTopic(removed: string[], added: string[]): string {
  const context = [...removed, ...added].join("\n").toLowerCase();
  if (context.includes("slug") && context.includes("word")) {
    return "slug word limit";
  }
  if (context.includes("slug")) {
    return "slug limit";
  }
  return "";
}

function summarizeMigration(added: string[], removed: string[]): string {
  const addedText = added.join("\n");
  if (!MIGRATE_FN.test(addedText)) {
    return "";
  }
  if (/legacy/i.test(addedText)) {
    return "migrate legacy entries path";
  }
  return "add data migration";
}

function summarizeKeyConfirmChange(added: string[], removed: string[]): string {
  const addedText = added.join("\n");
  const removedText = removed.join("\n");
  const hadQuestion = /question\(|readline\/promises|\[y\/N\]/i.test(removedText);
  const hasKeypress =
    /keypress/.test(addedText) &&
    (KEY_HANDLER.test(addedText) || /escape|return/.test(addedText));
  if (hadQuestion && hasKeypress) {
    if (/escape/.test(addedText) && /return/.test(addedText)) {
      return "use Enter/Esc for remove confirm";
    }
    return "use keypress for confirm prompt";
  }
  return "";
}

function summarizeStringLabelChange(added: string[], removed: string[]): string {
  const removedStrings = extractStringLiterals(removed);
  const addedStrings = extractStringLiterals(added);

  for (const [oldVal, newVal] of pairStringChanges(removedStrings, addedStrings)) {
    if (isPathLikeString(oldVal) || isPathLikeString(newVal)) {
      continue;
    }
    if (!looksLikeUserFacingText(oldVal) || !looksLikeUserFacingText(newVal)) {
      continue;
    }
    if (isUiLabel(oldVal, newVal)) {
      return "rename interactive list title";
    }
    if (oldVal.length >= 8 && newVal.length >= 3 && oldVal !== newVal) {
      const short = newVal.length <= 40 ? newVal : "label";
      return `change prompt to ${truncatePhrase(short)}`;
    }
  }
  return "";
}

function isUiLabel(oldVal: string, newVal: string): boolean {
  return (
    /things learned|memories|recently/i.test(oldVal) ||
    (/^[A-Z]/.test(oldVal) && /^[A-Z]/.test(newVal) && oldVal.split(" ").length <= 6)
  );
}

function pairStringChanges(
  removed: string[],
  added: string[]
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const usedAdded = new Set<number>();
  for (const oldVal of removed) {
    for (let i = 0; i < added.length; i++) {
      if (usedAdded.has(i)) {
        continue;
      }
      const newVal = added[i]!;
      if (oldVal !== newVal && similarContext(oldVal, newVal)) {
        pairs.push([oldVal, newVal]);
        usedAdded.add(i);
        break;
      }
    }
  }
  return pairs;
}

function similarContext(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) {
    return false;
  }
  if (isPathLikeString(a) || isPathLikeString(b)) {
    return false;
  }
  const aWords = a.toLowerCase().split(/\s+/);
  const bWords = b.toLowerCase().split(/\s+/);
  return aWords.filter((w) => bWords.includes(w)).length > 0;
}

function isPathLikeString(value: string): boolean {
  return (
    /(?:^|[^:])\.\.\//.test(value) ||
    /(?:^|\/)tools\//.test(value) ||
    /\.(?:tsx?|mts|cts|jsx?|mjs|cjs|json|mdc?)$/i.test(value)
  );
}

function looksLikeUserFacingText(value: string): boolean {
  if (isPathLikeString(value)) {
    return false;
  }
  if (/\$\{/.test(value) || /^misc:/.test(value) || /^tools\(/.test(value)) {
    return false;
  }
  if (/\s/.test(value)) {
    return true;
  }
  return /^[A-Z][a-z]/.test(value) && !value.includes("/");
}

function extractStringLiterals(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*import\s+/.test(line)) {
      continue;
    }
    if (/^\s*(?:return|throw)\s/.test(line)) {
      continue;
    }
    if (line.includes("${")) {
      continue;
    }
    for (const match of line.matchAll(STRING_LITERAL)) {
      const value = match[1]?.trim() ?? "";
      if (value.length >= 3 && !SKIP_STRINGS.has(value) && !/^[\x1b\\]/.test(value)) {
        out.push(value);
      }
    }
  }
  return out;
}

function summarizeImportChurn(added: string[], removed: string[]): string {
  const addedImports = added.filter((l) => IMPORT_ADDED.test(`+${l}`)).length;
  const removedImports = removed.filter((l) => IMPORT_REMOVED.test(`-${l}`)).length;
  if (addedImports + removedImports < 2) {
    return "";
  }
  if (addedImports > 0 && removedImports > 0) {
    return "";
  }
  return "";
}

function summarizeFlowAddition(
  path: string,
  added: string[],
  removed: string[]
): string {
  const name = basename(path);
  if (name !== "partial.ts" && name !== "interactive.ts") {
    return "";
  }
  const addedCount = added.length;
  const removedCount = removed.length;
  if (addedCount < 40) {
    return "";
  }
  if (name === "partial.ts" && /promote|partial|folder/i.test(added.join("\n"))) {
    return "add partial folder promote flow";
  }
  return "";
}

export function summarizeAddedFiles(files: StagedFile[]): string {
  const added = files.filter((file) => file.status === "A").map((file) => basename(file.path));
  if (added.length === 0) {
    return "";
  }
  if (added.includes("diffHints.ts")) {
    return "add diff hint commit summaries";
  }
  if (added.some((name) => name.endsWith(".test.ts"))) {
    return "add commit message fixtures";
  }
  return "";
}

function fileLabel(path: string): string {
  const name = basename(path);
  if (name.startsWith(".")) {
    return name;
  }
  return KNOWN_FILE_LABELS[name] ?? humanizeBasename(stripExtension(name));
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function humanizeBasename(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
}

function truncatePhrase(text: string): string {
  return text.length > 32 ? `${text.slice(0, 29)}...` : text;
}

function rankSummaries(summaries: string[]): string[] {
  const scored = summaries.map((s) => ({ s, score: scoreSummary(s) }));
  return scored
    .sort((a, b) => b.score - a.score || a.s.localeCompare(b.s))
    .map((x) => x.s);
}

function scoreSummary(summary: string): number {
  let score = summary.length;
  if (/^(add|drop|migrate|rename|document|use) /.test(summary)) {
    score += 20;
  }
  if (/partial folder promote flow/.test(summary)) {
    score += 40;
  }
  if (/shortcut|confirm|workflow|limit|migrate/.test(summary)) {
    score += 15;
  }
  if (/^update /.test(summary)) {
    score -= 10;
  }
  return score;
}

function isMarkdownFile(path: string): boolean {
  return /\.(?:md|mdx|mdc)$/i.test(path);
}

function isCodeFile(path: string): boolean {
  return /\.(?:tsx?|mts|cts|cs)$/i.test(path);
}
