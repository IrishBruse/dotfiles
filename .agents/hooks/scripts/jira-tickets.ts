#!/usr/bin/env node
/// <reference types="node" />

/**
 * Read tickets from ~/jira-board/{me,team,unassigned}/*.md (YAML frontmatter).
 * Sections: My tickets (me/), Teammates (team/), Unassigned (unassigned/).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BOARD_ROOT = path.join(os.homedir(), "jira-board");
const ME_DIR = path.join(BOARD_ROOT, "me");
const TEAM_DIR = path.join(BOARD_ROOT, "team");
const UNASSIGNED_DIR = path.join(BOARD_ROOT, "unassigned");

function stripQuotes(s: string) {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function parseFrontmatter(content: string) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    return { title: "(no title)", assignee: "Unassigned" };
  }
  let title = "";
  let assignee = "";
  for (const line of m[1].split(/\r?\n/)) {
    if (line.startsWith("title:")) {
      title = stripQuotes(line.slice("title:".length));
      continue;
    }
    const am = line.match(/^(assigned|asigneed):\s*(.*)$/);
    if (am) {
      assignee = stripQuotes(am[2]);
    }
  }
  return {
    title: title || "(no title)",
    assignee: assignee || "Unassigned",
  };
}

function listTicketFiles(dir: string): string[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((f) => path.join(dir, f));
}

function formatLine(key: string, title: string, assignee: string): string {
  return `${key}: ${title} — ${assignee}`;
}

function isDir(d: string): boolean {
  return fs.existsSync(d) && fs.statSync(d).isDirectory();
}

function linesFromFiles(files: string[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    const key = path.basename(f, ".md");
    const raw = fs.readFileSync(f, "utf8");
    const { title, assignee } = parseFrontmatter(raw);
    out.push(formatLine(key, title, assignee));
  }
  return out;
}

function pushSection(
  blocks: string[],
  title: string,
  dirExists: boolean,
  lines: string[],
): void {
  if (!dirExists) {
    return;
  }
  if (blocks.length > 0) {
    blocks.push("");
  }
  blocks.push(title, "");
  if (lines.length > 0) {
    blocks.push(...lines);
  } else {
    blocks.push("(no tickets)");
  }
}

function main() {
  if (!fs.existsSync(BOARD_ROOT) || !fs.statSync(BOARD_ROOT).isDirectory()) {
    console.error(`jira-tickets: board root not found: ${BOARD_ROOT}`);
    process.exit(1);
  }

  const meExists = isDir(ME_DIR);
  const teamExists = isDir(TEAM_DIR);
  const unassignedExists = isDir(UNASSIGNED_DIR);

  if (!meExists && !teamExists && !unassignedExists) {
    console.error(
      `jira-tickets: create one or more of ${ME_DIR}, ${TEAM_DIR}, ${UNASSIGNED_DIR}`,
    );
    process.exit(1);
  }

  const meFiles = listTicketFiles(ME_DIR);
  const teamFiles = listTicketFiles(TEAM_DIR);
  const unassignedFiles = listTicketFiles(UNASSIGNED_DIR);

  const blocks: string[] = [];

  pushSection(blocks, "My tickets", meExists, linesFromFiles(meFiles));
  pushSection(blocks, "Teammates", teamExists, linesFromFiles(teamFiles));
  pushSection(
    blocks,
    "Unassigned",
    unassignedExists,
    linesFromFiles(unassignedFiles),
  );

  for (const line of blocks) {
    console.log(line);
  }
}

main();
