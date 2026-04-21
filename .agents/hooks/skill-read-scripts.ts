#!/usr/bin/env node
/// <reference types="node" />

/**
 * preToolUse (Read): SKILL.md may contain ```!name\n...\n``` blocks. Runs the matching file
 * under workspace `.agents/hooks/scripts/` (basename `!name` or `name`, with any extension, or no extension)
 * with stdin = inner text, replaces inner with stdout. Prefers `!name` over `name` when both
 * exist. cwd = `.agents/hooks/scripts/`. Only files in that directory may run. Always allows the Read.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FENCE_SCRIPT = /```!([^\n`]+)\s*\r?\n([\s\S]*?)```/g;

type HookPayload = {
  tool_name?: string;
  workspace_roots?: string[];
  tool_input?: {
    target_file?: string;
    path?: string;
    file_path?: string;
    target?: string;
  };
};

type FenceBlock = {
  name: string;
  inner: string;
  start: number;
  end: number;
};

function allow(): void {
  console.log(JSON.stringify({ permission: "allow" }));
}

function exitAllow(): number {
  allow();
  return 0;
}

function resolvePath(data: HookPayload, relPath: string): string {
  if (path.isAbsolute(relPath)) return path.normalize(relPath);
  const base =
    (data.workspace_roots && data.workspace_roots[0]) ||
    process.env.CURSOR_PROJECT_DIR ||
    "";
  return base
    ? path.normalize(path.join(base, relPath.replace(/^\//, "")))
    : relPath;
}

/** Resolved path must stay under scriptsDir (no .. escape). */
function underScriptsDir(scriptsDir: string, rel: string): string | null {
  const resolved = path.resolve(scriptsDir, rel);
  const root = path.resolve(scriptsDir);
  const relToRoot = path.relative(root, resolved);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) return null;
  return resolved;
}

function workspaceRoot(data: HookPayload): string | null {
  const base =
    (data.workspace_roots && data.workspace_roots[0]) ||
    process.env.CURSOR_PROJECT_DIR ||
    "";
  return base ? path.normalize(base) : null;
}

function hooksScriptsDir(root: string): string {
  return path.join(root, ".agents", "hooks", "scripts");
}

/**
 * Finds an executable in `.agents/hooks/scripts` for fence marker `name` (e.g. `jira-tickets`).
 * Matches basename `!name` or `name` with any suffix (`.ts`, `.sh`, none, …).
 */
function resolveHooksScript(
  scriptsDir: string,
  markerName: string,
): string | null {
  const n = markerName.trim();
  if (!n) return null;
  if (!fs.existsSync(scriptsDir) || !fs.statSync(scriptsDir).isDirectory()) {
    return null;
  }

  const primaryBase = `!${n}`;
  const primary: string[] = [];
  const legacy: string[] = [];

  for (const ent of fs.readdirSync(scriptsDir)) {
    const full = underScriptsDir(scriptsDir, ent);
    if (!full) continue;
    if (!fs.statSync(full).isFile()) continue;
    const ext = path.extname(ent);
    const base = ext ? ent.slice(0, -ext.length) : ent;
    if (base === primaryBase) primary.push(full);
    else if (base === n) legacy.push(full);
  }

  const sortBasenames = (a: string, b: string) =>
    path
      .basename(a)
      .localeCompare(path.basename(b), undefined, { sensitivity: "base" });
  primary.sort(sortBasenames);
  legacy.sort(sortBasenames);

  return primary[0] ?? legacy[0] ?? null;
}

function fenceScriptBlocks(body: string): FenceBlock[] {
  const blocks: FenceBlock[] = [];
  let m: RegExpExecArray | null;
  FENCE_SCRIPT.lastIndex = 0;
  while ((m = FENCE_SCRIPT.exec(body)) !== null) {
    const name = m[1].trim();
    if (!name) continue;
    blocks.push({
      name,
      inner: m[2],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return blocks;
}

function main(): number {
  let input: HookPayload;
  try {
    // Hook event JSON from Cursor on stdin; `{}` if empty so parse never throws on "".
    const raw = fs.readFileSync(process.stdin.fd, { encoding: "utf8" }) || "{}";
    input = JSON.parse(raw) as HookPayload;
  } catch {
    return exitAllow();
  }

  if (input.tool_name !== "Read") {
    return exitAllow();
  }

  const ti = input.tool_input ?? {};
  const rel = ti.target_file ?? ti.path ?? ti.file_path ?? ti.target ?? "";
  if (!rel) {
    return exitAllow();
  }

  const filePath = resolvePath(input, rel);
  if (!filePath.endsWith("SKILL.md") || !fs.existsSync(filePath)) {
    return exitAllow();
  }

  let body: string;
  try {
    body = fs.readFileSync(filePath, { encoding: "utf8" });
  } catch {
    return exitAllow();
  }

  const root = workspaceRoot(input);
  if (!root) {
    return exitAllow();
  }
  const scriptsDir = hooksScriptsDir(root);
  const fences = fenceScriptBlocks(body);
  if (fences.length === 0) {
    return exitAllow();
  }

  let next = body;
  const scriptExists = new Map<string, boolean>();

  const runScript = (markerName: string, stdin: string | null | undefined) => {
    const script = resolveHooksScript(scriptsDir, markerName);
    if (!script) return null;
    let ok = scriptExists.get(script);
    if (ok === undefined) {
      ok = fs.existsSync(script);
      scriptExists.set(script, ok);
    }
    if (!ok) return null;
    return spawnSync(script, [], {
      cwd: scriptsDir,
      encoding: "utf8",
      input: stdin != null ? String(stdin) : undefined,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
  };

  // Replace from the end so match indices stay valid.
  fences.sort((a, b) => b.start - a.start);
  for (const block of fences) {
    const proc = runScript(block.name, block.inner);
    if (!proc) continue;
    const text = (proc.stdout ?? "").trimEnd();
    const replacement = `\`\`\`!${block.name}\n${text}\n\`\`\``;
    next = next.slice(0, block.start) + replacement + next.slice(block.end);
  }

  if (next !== body) {
    try {
      fs.writeFileSync(filePath, next, { encoding: "utf8" });
    } catch {
      /* Hook always allows Read; ignore unreadable/unwritable SKILL.md */
    }
  }

  return exitAllow();
}

process.exit(main());
