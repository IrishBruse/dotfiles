/**
 * Formats Cursor CLI stream-json (NDJSON) to stderr.
 * @see https://www.cursor.com/docs/cli/reference/output-format
 */

import process from "node:process";
import * as npath from "node:path";

const tty = process.stderr.isTTY === true;
const DIM = tty ? "\x1b[2m" : "";
const BOLD = tty ? "\x1b[1m" : "";
const YLW = tty ? "\x1b[33m" : "";
const BLU = tty ? "\x1b[34m" : "";
const MAG = tty ? "\x1b[35m" : "";
const RST = tty ? "\x1b[0m" : "";

function oneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) {
    return t;
  }
  return t.slice(0, max - 1) + "…";
}

const CD_PREFIX_RES = [
  /^cd\s+(\S+)\s*&&\s*(.*)$/s,
  /^cd\s+"([^"]+)"\s*&&\s*(.*)$/s,
  /^cd\s+'([^']+)'\s*&&\s*(.*)$/s,
];

/** If command is `cd <dir> && …` and <dir> is the project cwd, return the rest. */
function stripImpliedCd(command: string, projectRoot: string | undefined): string {
  if (projectRoot === undefined) {
    return command;
  }
  const root = npath.normalize(projectRoot);
  const t = command.trim();
  for (const re of CD_PREFIX_RES) {
    const m = t.match(re);
    if (m) {
      const p = m[1]!;
      const rest = m[2]!.trim();
      if (npath.normalize(p) === root && rest.length > 0) {
        return rest;
      }
    }
  }
  return command;
}

/** Shorten paths and agent-tools file names for display */
function shortPath(p: string, max = 64): string {
  if (p.length <= max) {
    return p;
  }
  const base = npath.basename(p);
  if (base.length > 0 && base.length < max) {
    if (npath.dirname(p).length < 8) {
      return p.slice(0, 28) + "…" + p.slice(-(max - 30));
    }
    return "…/" + oneLine(base, max - 2);
  }
  return p.slice(0, 28) + "…" + p.slice(-(max - 30));
}

/**
 * Path relative to agent workspace when inside it; otherwise shortened absolute.
 * Reads as `PR.md` / `src/foo.ts` instead of long tmp paths.
 */
function displayPath(
  p: string | undefined,
  projectCwd: string | undefined,
  max = 72,
): string {
  if (p == null || p === "") {
    return "?";
  }
  if (projectCwd === undefined || projectCwd === "") {
    return shortPath(p, max);
  }
  let absP: string;
  let absRoot: string;
  try {
    absP = npath.resolve(p);
    absRoot = npath.resolve(projectCwd);
  } catch {
    return shortPath(p, max);
  }
  const rel = npath.relative(absRoot, absP).replace(/\\/g, "/");
  if (rel !== "" && !rel.startsWith("..") && !npath.isAbsolute(rel)) {
    const out = rel === "" ? "." : rel;
    return out.length <= max ? out : shortPath(absP, max);
  }
  return shortPath(p, max);
}

function toolArgsRecord(inner: unknown): Record<string, unknown> | null {
  if (inner === null || typeof inner !== "object") {
    return null;
  }
  const a = (inner as { args?: unknown }).args;
  if (a !== null && typeof a === "object" && !Array.isArray(a)) {
    return a as Record<string, unknown>;
  }
  return null;
}

function summarizeGlobDetail(
  args: Record<string, unknown>,
  projectCwd: string | undefined,
): string {
  const rawDir =
    (typeof args.targetDirectory === "string" && args.targetDirectory) ||
    (typeof args.path === "string" && args.path) ||
    "";
  const pat =
    (typeof args.globPattern === "string" && args.globPattern) ||
    (typeof args.pattern === "string" && args.pattern) ||
    (typeof args.glob === "string" && args.glob) ||
    "**/*";
  const patShow = oneLine(pat, 52);
  if (
    rawDir &&
    projectCwd &&
    npath.resolve(rawDir) === npath.resolve(projectCwd)
  ) {
    return `${patShow} · .`;
  }
  const dirShow = rawDir ? displayPath(rawDir, projectCwd, 40) : ".";
  return `${patShow} · ${dirShow}`;
}

function summarizeGrepDetail(
  args: Record<string, unknown>,
  projectCwd: string | undefined,
): string {
  const pattern =
    (typeof args.pattern === "string" && args.pattern) ||
    (typeof args.regex === "string" && args.regex) ||
    "?";
  const filePath =
    (typeof args.path === "string" && args.path) ||
    (typeof args.file_path === "string" && args.file_path) ||
    "";
  const where = filePath ? displayPath(filePath, projectCwd, 44) : ".";
  return `${oneLine(pattern, 44)} · ${where}`;
}

function summarizeListDirDetail(
  args: Record<string, unknown>,
  projectCwd: string | undefined,
): string {
  const p =
    (typeof args.path === "string" && args.path) ||
    (typeof args.targetDirectory === "string" && args.targetDirectory) ||
    ".";
  return displayPath(p, projectCwd, 72);
}

/** Prefer named fields over raw JSON for unknown tools. */
function summarizeGenericToolArgs(args: unknown, projectCwd: string | undefined): string {
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    return oneLine(JSON.stringify(args), 96);
  }
  const o = args as Record<string, unknown>;
  const parts: string[] = [];
  const push = (label: string, val: string, cap: number) => {
    const t = oneLine(val, cap);
    if (t !== "") {
      parts.push(`${label}:${t}`);
    }
  };
  if (typeof o.pattern === "string") {
    push("pat", o.pattern, 40);
  }
  if (typeof o.globPattern === "string") {
    push("glob", o.globPattern, 40);
  }
  if (typeof o.query === "string") {
    push("q", o.query, 36);
  }
  if (typeof o.path === "string") {
    push("path", displayPath(o.path, projectCwd, 48), 52);
  }
  if (typeof o.targetDirectory === "string") {
    push("dir", displayPath(o.targetDirectory, projectCwd, 48), 52);
  }
  if (typeof o.url === "string") {
    push("url", o.url, 56);
  }
  if (parts.length > 0) {
    return oneLine(parts.join(" "), 100);
  }
  return oneLine(JSON.stringify(o), 96);
}

function getAssistantText(message: unknown): string {
  if (typeof message !== "object" || message === null) {
    return "";
  }
  const m = message as { content?: unknown };
  if (!Array.isArray(m.content)) {
    return "";
  }
  const parts: string[] = [];
  for (const part of m.content) {
    if (typeof part !== "object" || part === null) {
      continue;
    }
    const p = part as { type?: unknown; text?: unknown };
    if (p.type === "text" && typeof p.text === "string") {
      parts.push(p.text);
    }
  }
  return parts.join("");
}

function firstString(obj: unknown, keys: string[]): string {
  if (obj === null || typeof obj !== "object") {
    return "";
  }
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "") {
      return v;
    }
  }
  return "";
}

type ToolLine = { label: string; detail: string; color: string };

function isTaskToolStart(toolCall: unknown): boolean {
  if (toolCall === null || typeof toolCall !== "object") {
    return false;
  }
  return (
    typeof (toolCall as Record<string, unknown>).taskToolCall === "object" &&
    (toolCall as Record<string, unknown>).taskToolCall !== null
  );
}

const TASK_TEXT_KEYS = ["prompt", "description", "task", "name", "instruction"];

function taskToolSummary(args: Record<string, unknown> | undefined): string {
  const named = firstString(args, TASK_TEXT_KEYS);
  if (named) {
    return named;
  }
  if (!args) {
    return "";
  }
  return oneLine(
    Object.entries(args)
      .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
      .join(" "),
    120,
  );
}

function shellCommandRaw(toolCall: unknown): string {
  if (toolCall === null || typeof toolCall !== "object") {
    return "";
  }
  const tc = toolCall as Record<string, unknown>;
  if (typeof tc.shellToolCall !== "object" || !tc.shellToolCall) {
    return "";
  }
  const args = (tc.shellToolCall as { args?: Record<string, unknown> }).args;
  if (!args) {
    return "";
  }
  return (
    firstString(args, ["command", "script", "line"]) ||
    oneLine(
      Object.entries(args)
        .map(([, v]) => String(v))
        .join(" "),
      2_000,
    )
  );
}

function toolLabelFromKey(key: string): string {
  return key.replace(/ToolCall$/i, "");
}

function toolStartLine(
  toolCall: unknown,
  callId: string,
  projectCwd: string | undefined,
): ToolLine {
  const id = callId.length > 12 ? `${callId.slice(0, 12)}…` : callId;
  if (toolCall === null || typeof toolCall !== "object") {
    return { label: "tool", detail: id, color: YLW };
  }
  const tc = toolCall as Record<string, unknown>;

  if (typeof tc.shellToolCall === "object" && tc.shellToolCall) {
    return { label: "shell", detail: id, color: YLW };
  }
  if (typeof tc.readToolCall === "object" && tc.readToolCall) {
    const a = (tc.readToolCall as { args?: { path?: string } }).args;
    const p = a?.path ?? "?";
    return { label: "read", detail: displayPath(p, projectCwd), color: BLU };
  }
  if (typeof tc.writeToolCall === "object" && tc.writeToolCall) {
    const a = (tc.writeToolCall as { args?: { path?: string } }).args;
    const p = a?.path ?? "?";
    return { label: "write", detail: displayPath(p, projectCwd), color: BLU };
  }
  if (typeof tc.taskToolCall === "object" && tc.taskToolCall) {
    const args = (tc.taskToolCall as { args?: Record<string, unknown> }).args;
    const s = taskToolSummary(args);
    return { label: "task", detail: s || id, color: MAG };
  }
  if ("function" in tc) {
    const f = tc.function as { name?: string; arguments?: string };
    const n = f.name ?? "function";
    const a = (f.arguments ?? "").slice(0, 200);
    return { label: n, detail: oneLine(a, 100), color: YLW };
  }

  const namedPairs: [keyof typeof tc, (args: Record<string, unknown>) => string][] = [
    ["globToolCall", (args) => summarizeGlobDetail(args, projectCwd)],
    ["grepToolCall", (args) => summarizeGrepDetail(args, projectCwd)],
    ["ripgrepRawSearchToolCall", (args) => summarizeGrepDetail(args, projectCwd)],
    ["listDirToolCall", (args) => summarizeListDirDetail(args, projectCwd)],
    ["listDirectoryToolCall", (args) => summarizeListDirDetail(args, projectCwd)],
    ["codebaseSearchToolCall", (args) =>
      oneLine(
        (typeof args.query === "string" ? args.query : JSON.stringify(args.query)) +
          (typeof args.target_directories !== "undefined"
            ? ` · ${oneLine(String(args.target_directories), 40)}`
            : ""),
        96,
      )],
  ];
  for (const [k, fmt] of namedPairs) {
    const inner = tc[k];
    const args = toolArgsRecord(inner);
    if (args !== null) {
      const label = toolLabelFromKey(String(k));
      return { label, detail: fmt(args), color: YLW };
    }
  }

  const keys = Object.keys(tc);
  if (keys.length > 0) {
    const k0 = keys[0] as string;
    if (k0) {
      const v = tc[k0 as keyof typeof tc];
      if (v !== null && typeof v === "object") {
        const args = toolArgsRecord(v);
        if (args !== null) {
          const label = toolLabelFromKey(k0);
          return {
            label,
            detail: summarizeGenericToolArgs(args, projectCwd),
            color: YLW,
          };
        }
        const d = oneLine(JSON.stringify(v), 96);
        return { label: toolLabelFromKey(k0), detail: d, color: YLW };
      }
      return { label: toolLabelFromKey(k0), detail: String(v), color: YLW };
    }
  }
  return { label: "tool", detail: id, color: YLW };
}

function toolLeadNewline(separateFromPrevious: boolean): void {
  if (separateFromPrevious) {
    process.stderr.write("\n");
  }
}

/**
 * If set, shell `started` is only registered for a later `completed` pair; no `$` line yet
 * (avoids 3× `$` then 3× `✓` when the stream batched all starts before completes).
 */
function printToolStart(
  toolCall: unknown,
  callId: string,
  projectCwd: string | undefined,
  separateFromPrevious: boolean,
  registerShellForPair?: (id: string, command: string) => void,
): void {
  if (typeof toolCall === "object" && toolCall !== null) {
    const tc = toolCall as Record<string, unknown>;
    if (typeof tc.shellToolCall === "object" && tc.shellToolCall) {
      const raw = shellCommandRaw(toolCall);
      const cmd = raw ? stripImpliedCd(raw, projectCwd) : "?";
      if (registerShellForPair) {
        registerShellForPair(callId, cmd);
        return;
      }
      toolLeadNewline(separateFromPrevious);
      process.stderr.write(`${YLW}$${RST} ${BOLD}${cmd}${RST}\n`);
      return;
    }
    if (typeof tc.taskToolCall === "object" && tc.taskToolCall) {
      const args = (tc.taskToolCall as { args?: Record<string, unknown> }).args;
      const s = taskToolSummary(args);
      const line = s.length > 0
        ? oneLine(s, 500)
        : (callId.length > 0 ? oneLine(callId, 50) : "…");
      toolLeadNewline(separateFromPrevious);
      process.stderr.write(
        `${MAG}${BOLD}subagent${RST}  ${DIM}${line}${RST}\n`,
      );
      return;
    }
  }
  const { label, detail, color } = toolStartLine(
    toolCall,
    callId,
    projectCwd,
  );
  toolLeadNewline(separateFromPrevious);
  process.stderr.write(
    `${color}${BOLD}${label}${RST} ${DIM}${detail}${RST}\n`,
  );
}

type ToolDoneHooks = { onTaskEvent?: () => void };

/** Hooks only — tool completion lines are omitted (starts already show what ran). */
function printToolDone(toolCall: unknown, hooks?: ToolDoneHooks): void {
  if (toolCall !== null && typeof toolCall === "object" && "taskToolCall" in toolCall) {
    hooks?.onTaskEvent?.();
  }
}

const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏" as const;
const SUBAGENT_HANG_MSG =
  "subagent run (separate workstream; often 30s–2m; still connected)";

export class AgentStreamHandler {
  private lastResult: string | undefined;
  private resultError: string | undefined;
  private assistantStreamActive = false;
  private projectCwd: string | undefined;
  private subagentWaitTimer: ReturnType<typeof setInterval> | null = null;
  private subagentSpinnerFrame = 0;
  /** After at least one tool line was written; next tool gets one blank line above it. */
  private emittedToolLine = false;
  /** Pairs `tool_call` · `shell` `started` → `completed` when the stream batch-reorders events. */
  private shellByCallId = new Map<string, string>();

  private startSubagentWaitVisual(): void {
    this.stopSubagentWaitVisual();
    if (process.stderr.isTTY !== true) {
      process.stderr.write(
        `${DIM}  … ${SUBAGENT_HANG_MSG}${RST}\n`,
      );
      return;
    }
    this.subagentWaitTimer = setInterval(() => {
      const c = SPINNER[this.subagentSpinnerFrame % SPINNER.length] ?? "·";
      this.subagentSpinnerFrame += 1;
      const t = `  ${DIM}${c}  ${SUBAGENT_HANG_MSG} …${RST}  `;
      process.stderr.write(
        "\r" + " ".repeat(Math.max(0, 88)) + "\r" + t,
      );
    }, 300);
  }

  private stopSubagentWaitVisual(): void {
    if (this.subagentWaitTimer) {
      clearInterval(this.subagentWaitTimer);
      this.subagentWaitTimer = null;
    }
    this.subagentSpinnerFrame = 0;
    if (process.stderr.isTTY) {
      process.stderr.write(`\r${" ".repeat(96)}\r`);
    }
  }

  /** Stops the subagent line when the agent process exits (avoids a stuck spinner). */
  endStream(): void {
    this.stopSubagentWaitVisual();
    this.shellByCallId.clear();
  }

  private printShellPaired(callId: string, _toolCall: unknown): void {
    const cmd = this.shellByCallId.get(callId) ?? "?";
    this.shellByCallId.delete(callId);
    toolLeadNewline(this.emittedToolLine);
    this.emittedToolLine = true;
    process.stderr.write(`${YLW}$${RST} ${BOLD}${cmd}${RST}\n`);
  }

  handleObject(ev: unknown): void {
    if (typeof ev !== "object" || ev === null) {
      return;
    }
    const o = ev as Record<string, unknown>;
    const typ = o.type;
    if (typ === "system" && o.subtype === "init") {
      this.projectCwd =
        typeof o.cwd === "string" && o.cwd.length > 0
          ? o.cwd
          : this.projectCwd;
      const model = o.model;
      const cwd = o.cwd;
      if (typeof cwd === "string" && cwd.length > 0) {
        process.stderr.write(
          `${DIM}${String(model)}  ·  ${shortPath(cwd, 70)}${RST}\n`,
        );
      } else {
        process.stderr.write(`${DIM}${String(model)}${RST}\n`);
      }
      return;
    }
    if (typ === "user") {
      return;
    }
    if (typ === "assistant") {
      this.handleAssistant(o);
      return;
    }
    if (typ === "tool_call" && o.subtype === "started") {
      this.endAssistantBlock();
      const id =
        typeof o.call_id === "string" ? o.call_id : String(o.call_id ?? "…");
      const separate = this.emittedToolLine;
      let deferredShell = false;
      printToolStart(
        o.tool_call,
        id,
        this.projectCwd,
        separate,
        (cid, command) => {
          deferredShell = true;
          this.shellByCallId.set(cid, command);
        },
      );
      if (!deferredShell) {
        this.emittedToolLine = true;
      }
      if (isTaskToolStart(o.tool_call)) {
        this.startSubagentWaitVisual();
      }
      return;
    }
    if (typ === "tool_call" && o.subtype === "completed") {
      const tc = o.tool_call;
      if (
        typeof tc === "object" &&
        tc !== null &&
        (tc as Record<string, unknown>).shellToolCall != null
      ) {
        const cid =
          typeof o.call_id === "string"
            ? o.call_id
            : String(o.call_id ?? "…");
        this.printShellPaired(cid, tc);
        return;
      }
      printToolDone(tc, {
        onTaskEvent: () => {
          this.stopSubagentWaitVisual();
        },
      });
      return;
    }
    if (typ === "result" && o.is_error === true) {
      this.endAssistantBlock();
      this.stopSubagentWaitVisual();
      this.resultError =
        typeof o.error === "string"
          ? o.error
          : JSON.stringify(o, null, 0).slice(0, 2_000);
      process.stderr.write(
        `\n${YLW}error${RST} ${DIM}${this.resultError}${RST}\n\n`,
      );
      return;
    }
    if (typ === "result" && o.is_error === false) {
      this.endAssistantBlock();
      this.stopSubagentWaitVisual();
      const r = o.result;
      if (typeof r === "string") {
        this.lastResult = r;
        const ms = o.duration_ms;
        process.stderr.write(
          `\n${DIM}finished in ${String(ms)} ms${RST}\n`,
        );
      }
    }
  }

  private handleAssistant(o: Record<string, unknown>): void {
    const hasTs = "timestamp_ms" in o;
    const hasMc = Boolean(o.model_call_id);
    if (hasTs && hasMc) {
      return;
    }
    const text = getAssistantText(o.message);
    if (text.length === 0) {
      return;
    }
    if (hasTs && !hasMc) {
      if (!this.assistantStreamActive) {
        process.stderr.write(`\n${DIM}Response${RST}\n`);
        this.assistantStreamActive = true;
        process.stderr.write(text.replace(/^\n+/, ""));
        return;
      }
      process.stderr.write(text);
      return;
    }
    if (!hasTs) {
      this.endAssistantBlock();
      const body = text.replace(/^\n+/, "").replace(/\n+$/, "");
      process.stderr.write(`\n${DIM}Message${RST}\n${body}\n`);
    }
  }

  private endAssistantBlock(): void {
    if (this.assistantStreamActive) {
      process.stderr.write("\n");
      this.assistantStreamActive = false;
    }
  }

  getFinalResult(): string {
    if (this.resultError !== undefined) {
      throw new Error(this.resultError);
    }
    if (this.lastResult === undefined) {
      throw new Error("stream ended without a success result line");
    }
    return this.lastResult;
  }
}
