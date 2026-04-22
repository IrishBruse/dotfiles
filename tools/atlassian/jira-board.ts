#!/usr/bin/env node
/**
 * Print the local Jira board from `.agents/skills/jira-tickets/SKILL.md` as a table.
 * Usage: jira-board [path-to-SKILL.md]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import stringWidth from "string-width";
import { fileURLToPath } from "node:url";
import { CONFIG } from "./CONFIG.ts";

const OSC = "\u001B]";
const BEL = "\u0007";
function hyperlink(url: string, text: string): string {
  if (!process.stdout.isTTY) return text;
  return `${OSC}8;;${url}${BEL}${text}${OSC}8;;${BEL}`;
}

export type BoardRow = {
  group: string;
  status: string;
  key: string;
  title: string;
  assignee: string;
};

/** Print order: mine → unassigned → team. */
const GROUP_ORDER = ["Teammates", "Unassigned", "My tickets"] as const;
const STATUS_ORDER = ["Todo", "In progress", "Code review", "Done"] as const;

/** Map display group name → references subfolder name. */
const GROUP_TO_FOLDER: Record<string, string> = {
  "My tickets": "me",
  Teammates: "team",
  Unassigned: "unassigned",
};

const TICKET_RE = /^- \s*([A-Z][A-Z0-9_]*-\d+):\s*(.+?)\s+—\s+`([^`]+)`\s*$/u;

function stripFrontMatter(text: string): string {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return text;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return text;
  return lines.slice(end + 1).join("\n");
}

function parseBoardMarkdown(markdown: string): BoardRow[] {
  const body = stripFrontMatter(markdown);
  const rows: BoardRow[] = [];
  let group = "";
  let status = "";
  for (const line of body.split("\n")) {
    const h = line.match(/^#\s+(.+)\s*$/);
    if (h) {
      group = h[1]!.trim();
      continue;
    }
    const s = line.match(/^\*\*(.+?):\*\*\s*$/);
    if (s) {
      status = s[1]!.trim();
      continue;
    }
    const t = line.match(TICKET_RE);
    if (t) {
      rows.push({
        group,
        status,
        key: t[1]!,
        title: t[2]!.trim(),
        assignee: t[3]!,
      });
    }
  }
  return rows;
}

function rankIn(list: readonly string[], value: string): number {
  const i = list.findIndex((x) => x === value);
  if (i >= 0) return i;
  const j = list.findIndex((x) => x.toLowerCase() === value.toLowerCase());
  return j >= 0 ? j : list.length;
}

function sortRows(rows: BoardRow[]): BoardRow[] {
  return [...rows].sort((a, b) => {
    const g = rankIn(GROUP_ORDER, a.group) - rankIn(GROUP_ORDER, b.group);
    if (g !== 0) return g;
    const s = rankIn(STATUS_ORDER, a.status) - rankIn(STATUS_ORDER, b.status);
    if (s !== 0) return s;
    return a.key.localeCompare(b.key);
  });
}

const IND = "  ";
/** Pipes and spaces for 4 cells (empty content, same shape as a data row). */
const ROW_GLUE4 = IND + "│ " + " │ " + " │ " + " │ " + " │";
/** Do not let the title column grow past this (display columns). */
const TITLE_MAX_CAP = 80;

function vis(s: string): number {
  return stringWidth(s);
}

function padEndVis(s: string, w: number): string {
  const n = vis(s);
  if (n >= w) return s;
  return s + " ".repeat(w - n);
}

/** Clip to max display width; if `max` > 3, append `...` and stay within `max`. */
function clipVis(s: string, max: number): string {
  if (max <= 0) return "";
  if (vis(s) <= max) return s;
  const budget = max > 3 ? max - 3 : max; // "..." = 3 display cols when max > 3
  let out = s;
  while (vis(out) > budget && out.length > 0) {
    out = Array.from(out).slice(0, -1).join("");
  }
  return max > 3 ? out + "..." : out;
}

function formatSection(
  rows: BoardRow[],
  titleMax: number,
  widths: readonly [number, number, number, number],
  referencesDir: string,
): string {
  const headers = ["Status", "Key", "Title", "Assignee"] as const;
  const [wStatus, wKey, wTitle, wAssignee] = widths;
  const data = rows.map((r) => {
    const folder = GROUP_TO_FOLDER[r.group];
    const mdPath = folder
      ? path.join(referencesDir, folder, `${r.key}.md`)
      : "";
    const keyCell = mdPath
      ? hyperlink(`file://${mdPath}`, r.key)
      : r.key;
    const statusCell = hyperlink(
      `https://${CONFIG.site}/browse/${r.key}`,
      r.status,
    );
    return [statusCell, keyCell, clipVis(r.title, titleMax), r.assignee];
  });
  const wCols: number[] = [wStatus, wKey, wTitle, wAssignee];
  const dashes = (w: number) => "─".repeat(2 + w);

  const topLine = () => IND + "┌" + wCols.map((w) => dashes(w)).join("┬") + "┐";
  const sepLine = () => IND + "├" + wCols.map((w) => dashes(w)).join("┼") + "┤";
  const botLine = () => IND + "└" + wCols.map((w) => dashes(w)).join("┴") + "┘";
  const rowLine = (cells: string[]) =>
    IND +
    "│ " +
    cells.map((c, i) => padEndVis(c ?? "", wCols[i]!)).join(" │ ") +
    " │";

  const out: string[] = [];
  out.push(topLine());
  out.push(rowLine([...headers]));
  out.push(sepLine());
  for (const d of data) {
    out.push(rowLine(d));
  }
  out.push(botLine());
  return out.join("\n");
}

function formatTable(rows: BoardRow[], referencesDir: string): string {
  if (rows.length === 0) return "(no tickets in board file)\n";
  const headers = ["Status", "Key", "Title", "Assignee"] as const;
  const termCols = process.stdout.columns ?? 120;
  const wStatus = Math.max(vis(headers[0]!), ...rows.map((r) => vis(r.status)));
  const wKey = Math.max(vis(headers[1]!), ...rows.map((r) => vis(r.key)));
  const wAssignee = Math.max(
    vis(headers[3]!),
    ...rows.map((r) => vis(r.assignee)),
  );
  const fixedGlueW = vis(ROW_GLUE4);
  const titleMax = Math.min(
    TITLE_MAX_CAP,
    Math.max(
      vis(headers[2]!),
      12,
      termCols - fixedGlueW - wStatus - wKey - wAssignee,
    ),
  );
  const widths: [number, number, number, number] = [
    wStatus,
    wKey,
    titleMax,
    wAssignee,
  ];

  const sections: BoardRow[][] = [];
  for (const g of GROUP_ORDER) {
    const chunk = rows.filter((r) => r.group === g);
    if (chunk.length > 0) {
      sections.push(chunk);
    }
  }
  if (sections.length === 0) {
    return "(no tickets in board file)\n";
  }
  return (
    sections
      .map((s) => formatSection(s, titleMax, widths, referencesDir))
      .join("\n\n") + "\n"
  );
}

const defaultSkillPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
  ".agents/skills/jira-tickets/SKILL.md",
);

function main() {
  const arg = process.argv[2];
  const skillPath = path.resolve(arg ?? defaultSkillPath);
  if (!fs.existsSync(skillPath)) {
    console.error(`jira-board: file not found: ${skillPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(skillPath, "utf8");
  const rows = sortRows(parseBoardMarkdown(raw));
  const referencesDir = path.join(path.dirname(skillPath), "references");
  process.stdout.write(formatTable(rows, referencesDir));
}

main();
