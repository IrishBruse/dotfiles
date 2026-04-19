#!/usr/bin/env node
/// <reference types="node" />

/**
 * postToolUse / postToolUseFailure (Read): if skill-read-scripts.ts wrote a backup
 * before expanding ```!``` blocks, restore SKILL.md from that backup and delete it.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type HookPayload = {
  tool_name?: string;
  workspace_roots?: string[];
  tool_input?:
    | {
        target_file?: string;
        path?: string;
        file_path?: string;
        target?: string;
      }
    | string;
};

/** Must match skill-read-scripts.ts */
function backupPathForSkillFile(filePath: string): string {
  const h = crypto.createHash("sha256").update(filePath).digest("hex").slice(0, 24);
  return path.join(os.tmpdir(), `cursor-skill-read-${h}.bak`);
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

function parseToolInput(
  ti: HookPayload["tool_input"],
): Record<string, unknown> | null {
  if (ti == null) return null;
  if (typeof ti === "string") {
    try {
      return JSON.parse(ti) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return ti as Record<string, unknown>;
}

function relFromPayload(data: HookPayload): string {
  const ti = parseToolInput(data.tool_input);
  if (!ti) return "";
  const v = ti.target_file ?? ti.path ?? ti.file_path ?? ti.target;
  return v != null ? String(v) : "";
}

function done(): void {
  console.log(JSON.stringify({}));
}

function main(): number {
  let input: HookPayload;
  try {
    const raw = fs.readFileSync(process.stdin.fd, { encoding: "utf8" }) || "{}";
    input = JSON.parse(raw) as HookPayload;
  } catch {
    done();
    return 0;
  }

  if (input.tool_name !== "Read") {
    done();
    return 0;
  }

  const rel = relFromPayload(input);
  if (!rel) {
    done();
    return 0;
  }

  const filePath = resolvePath(input, rel);
  if (!filePath.endsWith("SKILL.md")) {
    done();
    return 0;
  }

  const bak = backupPathForSkillFile(filePath);
  if (!fs.existsSync(bak)) {
    done();
    return 0;
  }

  let original: string;
  try {
    original = fs.readFileSync(bak, { encoding: "utf8" });
  } catch {
    done();
    return 0;
  }

  try {
    fs.writeFileSync(filePath, original, { encoding: "utf8" });
    fs.unlinkSync(bak);
  } catch {
    /* best effort */
  }

  done();
  return 0;
}

process.exit(main());
