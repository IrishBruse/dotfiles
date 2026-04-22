#!/usr/bin/env node
/**
 * Print the local Jira board from `.agents/skills/jira-tickets/SKILL.md`.
 * In a TTY it is interactive: ↑/↓ (or j/k) to move between tickets,
 * Enter to open the local md reference, `o` to open the Jira issue in
 * your browser, q / Esc / Ctrl-C to quit.
 * Usage: jira-board [path-to-SKILL.md]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { spawn } from "node:child_process";
import stringWidth from "string-width";
import { fileURLToPath } from "node:url";
import { CONFIG } from "./CONFIG.ts";

export type BoardRow = {
  group: string;
  status: string;
  key: string;
  title: string;
  assignee: string;
};

/** Print order: mine → unassigned → team. */
const GROUP_ORDER = ["My tickets", "Unassigned", "Teammates"] as const;
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
  const budget = max > 3 ? max - 3 : max;
  let out = s;
  while (vis(out) > budget && out.length > 0) {
    out = Array.from(out).slice(0, -1).join("");
  }
  return max > 3 ? out + "..." : out;
}

type Widths = readonly [number, number, number, number];

function computeWidths(rows: BoardRow[]): { widths: Widths; titleMax: number } {
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
  return { widths: [wStatus, wKey, titleMax, wAssignee], titleMax };
}

/** Split rows into display sections in GROUP_ORDER; empty groups dropped. */
function groupSections(rows: BoardRow[]): BoardRow[][] {
  const sections: BoardRow[][] = [];
  for (const g of GROUP_ORDER) {
    const chunk = rows.filter((r) => r.group === g);
    if (chunk.length > 0) sections.push(chunk);
  }
  return sections;
}

// --- Plain (non-interactive) rendering ------------------------------------

function formatSectionPlain(
  rows: BoardRow[],
  titleMax: number,
  widths: Widths,
): string {
  const headers = ["Status", "Key", "Title", "Assignee"] as const;
  const wCols: number[] = [...widths];
  const dashes = (w: number) => "─".repeat(2 + w);
  const topLine = IND + "┌" + wCols.map(dashes).join("┬") + "┐";
  const sepLine = IND + "├" + wCols.map(dashes).join("┼") + "┤";
  const botLine = IND + "└" + wCols.map(dashes).join("┴") + "┘";
  const rowLine = (cells: string[]) =>
    IND +
    "│ " +
    cells.map((c, i) => padEndVis(c ?? "", wCols[i]!)).join(" │ ") +
    " │";
  const out: string[] = [topLine, rowLine([...headers]), sepLine];
  for (const r of rows) {
    out.push(rowLine([r.status, r.key, clipVis(r.title, titleMax), r.assignee]));
  }
  out.push(botLine);
  return out.join("\n");
}

function formatTablePlain(rows: BoardRow[]): string {
  if (rows.length === 0) return "(no tickets in board file)\n";
  const { widths, titleMax } = computeWidths(rows);
  const sections = groupSections(rows);
  if (sections.length === 0) return "(no tickets in board file)\n";
  return (
    sections
      .map((s) => formatSectionPlain(s, titleMax, widths))
      .join("\n\n") + "\n"
  );
}

// --- Interactive rendering ------------------------------------------------

const ESC = "\u001B";
/** Enter alternate screen buffer (preserves the user's terminal scrollback). */
const ENTER_ALT = `${ESC}[?1049h`;
/** Leave alternate screen buffer (restores prior terminal contents). */
const LEAVE_ALT = `${ESC}[?1049l`;
/** Move cursor to top-left without clearing. */
const HOME = `${ESC}[H`;
/** Erase from cursor to end of screen. */
const CLR_EOS = `${ESC}[J`;
/** Erase from cursor to end of line. */
const CLR_EOL = `${ESC}[K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const INVERT = `${ESC}[7m`;
const RESET = `${ESC}[0m`;

function renderInteractiveLines(
  rows: BoardRow[],
  selected: number,
  widths: Widths,
  titleMax: number,
): { lines: string[]; dataLineIndexes: number[] } {
  const headers = ["Status", "Key", "Title", "Assignee"] as const;
  const wCols: number[] = [...widths];
  const dashes = (w: number) => "─".repeat(2 + w);
  const topLine = IND + "┌" + wCols.map(dashes).join("┬") + "┐";
  const sepLine = IND + "├" + wCols.map(dashes).join("┼") + "┤";
  const botLine = IND + "└" + wCols.map(dashes).join("┴") + "┘";
  const rowLine = (cells: string[]) =>
    IND +
    "│ " +
    cells.map((c, i) => padEndVis(c ?? "", wCols[i]!)).join(" │ ") +
    " │";

  const sections = groupSections(rows);
  const out: string[] = [];
  const dataLineIndexes: number[] = [];
  let idx = 0;
  for (let si = 0; si < sections.length; si++) {
    if (si > 0) out.push("");
    out.push(topLine);
    out.push(rowLine([...headers]));
    out.push(sepLine);
    for (const r of sections[si]!) {
      const line = rowLine([
        r.status,
        r.key,
        clipVis(r.title, titleMax),
        r.assignee,
      ]);
      out.push(idx === selected ? INVERT + line + RESET : line);
      dataLineIndexes[idx] = out.length - 1;
      idx++;
    }
    out.push(botLine);
  }
  return { lines: out, dataLineIndexes };
}

function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
}

function runInteractive(rows: BoardRow[], referencesDir: string): void {
  let { widths, titleMax } = computeWidths(rows);
  let selected = 0;
  let scrollTop = 0;
  const stdin = process.stdin;
  const stdout = process.stdout;
  let prevViewportLines = 0;

  const draw = () => {
    const { lines, dataLineIndexes } = renderInteractiveLines(
      rows,
      selected,
      widths,
      titleMax,
    );
    const termRows = Math.max(1, stdout.rows ?? 48);
    const selLine = dataLineIndexes[selected] ?? 0;
    if (selLine < scrollTop) scrollTop = selLine;
    else if (selLine >= scrollTop + termRows) scrollTop = selLine - termRows + 1;
    const maxScroll = Math.max(0, lines.length - termRows);
    scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

    const slice = lines.slice(scrollTop, scrollTop + termRows);
    while (slice.length < termRows) slice.push("");

    let buf = HOME;
    for (const line of slice) {
      buf += line + CLR_EOL + "\r\n";
    }
    if (slice.length < prevViewportLines) buf += CLR_EOS;
    stdout.write(buf);
    prevViewportLines = slice.length;
  };

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (stdin.isTTY) stdin.setRawMode(false);
    stdout.write(SHOW_CURSOR + LEAVE_ALT);
    stdin.pause();
  };

  const exit = (code: number) => {
    cleanup();
    process.exit(code);
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => exit(130));
  process.on("SIGTERM", () => exit(143));
  process.on("SIGHUP", () => exit(129));
  process.on("uncaughtException", (err) => {
    cleanup();
    console.error(err);
    process.exit(1);
  });

  readline.emitKeypressEvents(stdin);
  if (stdin.isTTY) stdin.setRawMode(true);
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
  draw();

  stdin.on("keypress", (_str, key) => {
    if (!key) return;
    if (key.ctrl && key.name === "c") {
      exit(130);
      return;
    }
    switch (key.name) {
      case "q":
      case "escape":
        exit(0);
        return;
      case "up":
      case "k":
        selected = (selected - 1 + rows.length) % rows.length;
        draw();
        return;
      case "down":
      case "j":
        selected = (selected + 1) % rows.length;
        draw();
        return;
      case "home":
      case "g":
        selected = 0;
        draw();
        return;
      case "end":
        selected = rows.length - 1;
        draw();
        return;
      case "return": {
        const r = rows[selected]!;
        const folder = GROUP_TO_FOLDER[r.group];
        if (folder) {
          const mdPath = path.join(referencesDir, folder, `${r.key}.md`);
          if (fs.existsSync(mdPath)) openUrl(`file://${mdPath}`);
        }
        return;
      }
      case "o": {
        const r = rows[selected]!;
        openUrl(`https://${CONFIG.site}/browse/${r.key}`);
        return;
      }
    }
  });

  stdout.on("resize", () => {
    ({ widths, titleMax } = computeWidths(rows));
    prevViewportLines = 0;
    stdout.write(HOME + CLR_EOS);
    draw();
  });
}

// --- Entry point ----------------------------------------------------------

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

  if (!process.stdout.isTTY || !process.stdin.isTTY || rows.length === 0) {
    process.stdout.write(formatTablePlain(rows));
    return;
  }
  runInteractive(rows, referencesDir);
}

main();
