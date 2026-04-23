#!/usr/bin/env node
/**
 * Print the local Jira board from `.agents/skills/jira-tickets/SKILL.md`.
 * In a TTY it is interactive: ↑/↓ (or j/k) between tickets, ←/→ to switch
 * tabs (row above the table), Enter to open the local md,
 * `o` for Jira in browser, `u` to run jira-board-sync and reload, q / Esc / Ctrl-C to quit.
 * Usage: jira-board [path-to-SKILL.md]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
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

/** Pipes and spaces for 4 cells (empty content, same shape as a data row). */
const ROW_GLUE4 = "│ " + " │ " + " │ " + " │ " + " │";
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

function rowsForGroup(rows: BoardRow[], group: string): BoardRow[] {
  return rows.filter((r) => r.group === group);
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
  const topLine = "┌" + wCols.map(dashes).join("┬") + "┐";
  const sepLine = "├" + wCols.map(dashes).join("┼") + "┤";
  const botLine = "└" + wCols.map(dashes).join("┴") + "┘";
  const rowLine = (cells: string[]) =>
    "│ " +
    cells.map((c, i) => padEndVis(c ?? "", wCols[i]!)).join(" │ ") +
    " │";
  const out: string[] = [topLine, rowLine([...headers]), sepLine];
  for (const r of rows) {
    out.push(
      rowLine([r.status, r.key, clipVis(r.title, titleMax), r.assignee]),
    );
  }
  out.push(botLine);
  return out.join("\n");
}

function formatTablePlain(rows: BoardRow[]): string {
  if (rows.length === 0) return "(no tickets in board file)\n";
  const { widths, titleMax } = computeWidths(rows);
  return formatSectionPlain(rows, titleMax, widths) + "\n";
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
const DIM = `${ESC}[2m`;
/** Tab labels: gray when inactive, white when selected (24-bit; no bold). */
const TAB_INACTIVE = `${ESC}[38;2;150;150;150m`;
const TAB_SELECTED = `${ESC}[38;2;255;255;255m`;
const RESET = `${ESC}[0m`;

const HELP_CONTROLS =
  "↑/↓ j/k · ←/→ tabs · u sync · Enter md · o Jira · q quit";

/** Tab strip: inactive gray, selected white, separated by `|`. */
function formatTabGraphic(tabIndex: number): string {
  const sep = "  |  ";
  const parts: string[] = [];
  for (let i = 0; i < GROUP_ORDER.length; i++) {
    const name = GROUP_ORDER[i]!;
    parts.push(
      i === tabIndex
        ? TAB_SELECTED + name + RESET
        : TAB_INACTIVE + name + RESET,
    );
  }
  return parts.join(sep);
}

function renderInteractiveLines(
  tabIndex: number,
  tabRows: BoardRow[],
  selected: number,
  widths: Widths,
  titleMax: number,
): {
  lines: string[];
  dataLineIndexes: number[];
  prefixLineCount: number;
  suffixLineCount: number;
} {
  const headers = ["Status", "Key", "Title", "Assignee"] as const;
  const wCols: number[] = [...widths];
  const dashes = (w: number) => "─".repeat(2 + w);
  const topLine = "┌" + wCols.map(dashes).join("┬") + "┐";
  const sepLine = "├" + wCols.map(dashes).join("┼") + "┤";
  const botLine = "└" + wCols.map(dashes).join("┴") + "┘";
  const rowLine = (cells: string[]) =>
    "│ " +
    cells.map((c, i) => padEndVis(c ?? "", wCols[i]!)).join(" │ ") +
    " │";

  const out: string[] = [];
  out.push(formatTabGraphic(tabIndex));
  out.push(topLine);
  out.push(rowLine([...headers]));
  out.push(sepLine);
  const dataLineIndexes: number[] = [];
  let idx = 0;
  for (const r of tabRows) {
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
  /** Tab strip + table top + column headers + row separator (fixed above scrolled rows). */
  const prefixLineCount = 4;
  /** Bottom table border (fixed with data slice; blank line before keybindings is in draw()). */
  const suffixLineCount = 1;
  return {
    lines: out,
    dataLineIndexes,
    prefixLineCount,
    suffixLineCount,
  };
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

function runInteractive(
  skillPath: string,
  initialRows: BoardRow[],
  referencesDir: string,
): void {
  let rows = initialRows;
  let { widths, titleMax } = computeWidths(rows);
  let tabIndex = 0;
  let selected = 0;
  let scrollTop = 0;
  const stdin = process.stdin;
  const stdout = process.stdout;
  let prevViewportLines = 0;

  const tabRows = () => rowsForGroup(rows, GROUP_ORDER[tabIndex]!);

  const draw = () => {
    const tr = tabRows();
    if (selected >= tr.length) selected = Math.max(0, tr.length - 1);
    const { lines, dataLineIndexes, prefixLineCount, suffixLineCount } =
      renderInteractiveLines(tabIndex, tr, selected, widths, titleMax);
    const termCols = stdout.columns ?? 120;
    const termRows = Math.max(1, stdout.rows ?? 48);
    const footerRows = termRows > 1 ? 1 : 0;
    /** Blank line between table (incl. bottom rule) and keybindings. */
    const footerGapRows = footerRows > 0 ? 1 : 0;
    /** Blank lines after HOME so the board sits slightly lower in the panel. */
    const topMargin = termRows > footerRows + footerGapRows + 6 ? 1 : 0;
    const bodyRows = Math.max(
      1,
      termRows - footerRows - footerGapRows - topMargin,
    );

    const dataCount = tr.length;
    const scrollH = Math.max(0, bodyRows - prefixLineCount - suffixLineCount);

    let slice: string[];
    if (bodyRows <= prefixLineCount + suffixLineCount) {
      scrollTop = 0;
      slice = lines.slice(0, bodyRows);
      while (slice.length < bodyRows) slice.push("");
    } else {
      const selData =
        tr.length > 0 ? dataLineIndexes[selected]! - prefixLineCount : 0;
      if (selData < scrollTop) scrollTop = selData;
      else if (scrollH > 0 && selData >= scrollTop + scrollH) {
        scrollTop = selData - scrollH + 1;
      }
      const maxScroll = Math.max(0, dataCount - scrollH);
      scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

      const head = lines.slice(0, prefixLineCount);
      const dataStart = prefixLineCount + scrollTop;
      const firstIndexAfterDataRows = prefixLineCount + dataCount;
      const dataSlice = lines.slice(
        dataStart,
        Math.min(dataStart + scrollH, firstIndexAfterDataRows),
      );
      const tail = lines.slice(lines.length - suffixLineCount);
      slice = [...head, ...dataSlice, ...tail];
      while (slice.length < bodyRows) slice.push("");
    }

    let buf = HOME;
    for (let m = 0; m < topMargin; m++) {
      buf += CLR_EOL + "\r\n";
    }
    for (const line of slice) {
      buf += line + CLR_EOL + "\r\n";
    }
    for (let g = 0; g < footerGapRows; g++) {
      buf += CLR_EOL + "\r\n";
    }
    if (footerRows > 0) {
      const budget = Math.max(0, termCols);
      buf += DIM + clipVis(HELP_CONTROLS, budget) + RESET + CLR_EOL + "\r\n";
    }
    const written = topMargin + slice.length + footerGapRows + footerRows;
    if (written < prevViewportLines) buf += CLR_EOS;
    stdout.write(buf);
    prevViewportLines = written;
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
      case "k": {
        const tr = tabRows();
        if (tr.length === 0) return;
        selected = (selected - 1 + tr.length) % tr.length;
        draw();
        return;
      }
      case "down":
      case "j": {
        const tr = tabRows();
        if (tr.length === 0) return;
        selected = (selected + 1) % tr.length;
        draw();
        return;
      }
      case "left": {
        tabIndex = (tabIndex - 1 + GROUP_ORDER.length) % GROUP_ORDER.length;
        selected = 0;
        scrollTop = 0;
        draw();
        return;
      }
      case "right": {
        tabIndex = (tabIndex + 1) % GROUP_ORDER.length;
        selected = 0;
        scrollTop = 0;
        draw();
        return;
      }
      case "home":
      case "g":
        selected = 0;
        draw();
        return;
      case "end": {
        const tr = tabRows();
        selected = tr.length > 0 ? tr.length - 1 : 0;
        draw();
        return;
      }
      case "return": {
        const tr = tabRows();
        const r = tr[selected];
        if (!r) return;
        const folder = GROUP_TO_FOLDER[r.group];
        if (folder) {
          const mdPath = path.join(referencesDir, folder, `${r.key}.md`);
          if (fs.existsSync(mdPath)) openUrl(`file://${mdPath}`);
        }
        return;
      }
      case "o": {
        const tr = tabRows();
        const r = tr[selected];
        if (!r) return;
        openUrl(`https://${CONFIG.site}/browse/${r.key}`);
        return;
      }
      case "u": {
        if (!fs.existsSync(JIRA_BOARD_SYNC_JS)) return;
        stdin.pause();
        stdin.setRawMode(false);
        stdout.write(SHOW_CURSOR + LEAVE_ALT);
        const r = spawnSync(process.execPath, [JIRA_BOARD_SYNC_JS], {
          stdio: "inherit",
          env: process.env,
        });
        stdin.resume();
        if (stdin.isTTY) stdin.setRawMode(true);
        stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
        if (r.status === 0 && fs.existsSync(skillPath)) {
          const raw = fs.readFileSync(skillPath, "utf8");
          rows = sortRows(parseBoardMarkdown(raw));
          ({ widths, titleMax } = computeWidths(rows));
          selected = 0;
          scrollTop = 0;
        }
        prevViewportLines = 0;
        draw();
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

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const JIRA_BOARD_SYNC_JS = path.join(TOOL_DIR, "bin", "jira-board-sync.js");
const defaultSkillPath = path.join(
  TOOL_DIR,
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
  runInteractive(skillPath, rows, referencesDir);
}

main();
