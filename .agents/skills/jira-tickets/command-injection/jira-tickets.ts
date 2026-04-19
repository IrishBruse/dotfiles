#!/usr/bin/env node
/// <reference types="node" />

/**
 * Read tickets from ../board/*.md (YAML frontmatter) and print one line per ticket.
 * Tickets assigned to MY_USERNAME are listed first, then a blank line, then the rest.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Set to your Jira display name (must match the "assigned:" field in board files).
const MY_USERNAME = "Ethan Conneely";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOARD_DIR = path.join(__dirname, "..", "board");

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

function main() {
  if (!fs.existsSync(BOARD_DIR) || !fs.statSync(BOARD_DIR).isDirectory()) {
    console.error(`jira-tickets: board directory not found: ${BOARD_DIR}`);
    process.exit(1);
  }

  const boardFiles = fs
    .readdirSync(BOARD_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((f) => path.join(BOARD_DIR, f));

  if (boardFiles.length === 0) {
    console.error("(no tickets in board)");
    process.exit(0);
  }

  const mine = [];
  const rest = [];

  for (const f of boardFiles) {
    const key = path.basename(f, ".md");
    const raw = fs.readFileSync(f, "utf8");
    const { title, assignee } = parseFrontmatter(raw);
    const out = `${key}: ${title} — ${assignee}`;
    if (MY_USERNAME && assignee === MY_USERNAME) {
      mine.push(out);
    } else {
      rest.push(out);
    }
  }

  for (const line of mine) {
    console.log(line);
  }
  if (MY_USERNAME && mine.length > 0 && rest.length > 0) {
    console.log("");
  }
  for (const line of rest) {
    console.log(line);
  }
}

main();
