import fs from "node:fs";
import path from "node:path";

import { formatTicketMarkdown } from "../../lib/format.ts";
import type { BoardSprint, Folder, WriteBoardResult } from "../../lib/types.ts";

/** Keep tickets from sprints within this many days before start and after end. */
export const SPRINT_RETENTION_BUFFER_MS = 2 * 24 * 60 * 60 * 1000;

function* issuesWithKeys(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>
): Generator<{ key: string; fields: Record<string, unknown> }> {
  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    yield { key, fields: issue.fields ?? {} };
  }
}

function ticketKeyFromFilename(filename: string): string | null {
  const m = /^([A-Z]+-\d+)\.md$/.exec(filename);
  return m ? m[1] : null;
}

function parseSprintInstant(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Inclusive window: [start - 2d, end + 2d]. Sprints missing dates are excluded. */
export function isSprintInRetentionWindow(
  sprint: BoardSprint,
  nowMs: number = Date.now()
): boolean {
  const start = parseSprintInstant(sprint.startDate);
  const end = parseSprintInstant(sprint.endDate);
  if (start == null || end == null) return false;
  const windowStart = start - SPRINT_RETENTION_BUFFER_MS;
  const windowEnd = end + SPRINT_RETENTION_BUFFER_MS;
  return nowMs >= windowStart && nowMs <= windowEnd;
}

export function sprintsInRetentionWindow(
  sprints: BoardSprint[],
  nowMs: number = Date.now()
): BoardSprint[] {
  return sprints.filter((s) => isSprintInRetentionWindow(s, nowMs));
}

/** Delete misc tickets not in the current fetch once any sprint is past end + 2d. */
export function miscDeleteCutoffMs(
  sprints: BoardSprint[],
  nowMs: number = Date.now()
): number {
  let cutoff = 0;
  for (const sprint of sprints) {
    const end = parseSprintInstant(sprint.endDate);
    if (end == null) continue;
    const sprintCutoff = end + SPRINT_RETENTION_BUFFER_MS;
    if (nowMs > sprintCutoff) {
      cutoff = Math.max(cutoff, sprintCutoff);
    }
  }
  return cutoff;
}

export function shouldDeleteMiscTicket(
  inCurrentFetch: boolean,
  sprints: BoardSprint[],
  nowMs: number = Date.now()
): boolean {
  if (inCurrentFetch) return false;
  const cutoff = miscDeleteCutoffMs(sprints, nowMs);
  return cutoff > 0 && nowMs > cutoff;
}

function cleanBoardFolders(roots: Record<Folder, string>): void {
  for (const folder of ["me", "unassigned", "team"] as const) {
    const dir = roots[folder];
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) {
        fs.unlinkSync(path.join(dir, f));
      }
    }
  }
}

export function writeBoard(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  options: {
    outputRoot: string;
    meAccountId: string;
    siteHost: string;
    clean: boolean;
    /** All board sprints (for misc cleanup vs sprint end + 2d). */
    boardSprints: BoardSprint[];
    nowMs?: number;
  }
): WriteBoardResult {
  const { outputRoot, meAccountId, siteHost, boardSprints } = options;
  const nowMs = options.nowMs ?? Date.now();
  const roots: Record<Folder, string> = {
    me: path.join(outputRoot, "me"),
    unassigned: path.join(outputRoot, "unassigned"),
    team: path.join(outputRoot, "team"),
    misc: path.join(outputRoot, "misc")
  };
  for (const p of Object.values(roots)) {
    fs.mkdirSync(p, { recursive: true });
  }

  if (options.clean) {
    cleanBoardFolders(roots);
  }

  const fetchedKeys = new Set<string>();
  for (const { key } of issuesWithKeys(issues)) {
    fetchedKeys.add(key);
  }

  const existingFiles = new Map<string, { folder: Folder; path: string }>();
  for (const [folder, dir] of Object.entries(roots)) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const key = ticketKeyFromFilename(f);
      if (key) {
        existingFiles.set(key, {
          folder: folder as Folder,
          path: path.join(dir, f)
        });
      }
    }
  }

  const archived: string[] = [];
  for (const [key, { folder, path: filePath }] of existingFiles.entries()) {
    if (fetchedKeys.has(key)) continue;
    if (folder !== "misc") {
      const miscPath = path.join(roots.misc, `${key}.md`);
      fs.renameSync(filePath, miscPath);
      existingFiles.set(key, { folder: "misc", path: miscPath });
      archived.push(key);
    }
  }

  const deleted: string[] = [];
  for (const f of fs.readdirSync(roots.misc)) {
    if (!f.endsWith(".md")) continue;
    const filePath = path.join(roots.misc, f);
    const key = ticketKeyFromFilename(f);
    if (
      key &&
      shouldDeleteMiscTicket(fetchedKeys.has(key), boardSprints, nowMs)
    ) {
      fs.unlinkSync(filePath);
      existingFiles.delete(key);
      deleted.push(key);
    }
  }

  const added: string[] = [];
  const updated: string[] = [];
  const moved: Array<{ key: string; from: Folder; to: Folder }> = [];
  const counts: Record<Folder, number> = {
    me: 0,
    unassigned: 0,
    team: 0,
    misc: 0
  };

  for (const { key, fields } of issuesWithKeys(issues)) {
    const { folder, body } = formatTicketMarkdown(
      key,
      fields,
      siteHost,
      meAccountId
    );
    const out = path.join(roots[folder], `${key}.md`);
    const prev = existingFiles.get(key);

    if (!prev) {
      added.push(key);
    } else if (prev.folder !== folder) {
      fs.unlinkSync(prev.path);
      moved.push({ key, from: prev.folder, to: folder });
    } else {
      let prior = "";
      try {
        prior = fs.readFileSync(prev.path, "utf-8");
      } catch {
        prior = "";
      }
      if (prior !== body) updated.push(key);
    }

    fs.writeFileSync(out, body, "utf-8");
    existingFiles.set(key, { folder, path: out });
    counts[folder] += 1;
  }

  for (const f of fs.readdirSync(roots.misc)) {
    if (f.endsWith(".md")) counts.misc += 1;
  }

  const sortKeys = (keys: string[]) =>
    keys.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  sortKeys(added);
  sortKeys(updated);
  sortKeys(archived);
  sortKeys(deleted);
  moved.sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { sensitivity: "base" })
  );

  return { counts, added, updated, moved, archived, deleted };
}
