/**
 * Formats Cursor CLI stream-json (NDJSON) to stderr.
 * @see https://www.cursor.com/docs/cli/reference/output-format
 */

import process from "node:process";
import * as npath from "node:path";

const tty = process.stderr.isTTY === true;
const DIM = tty ? "\x1b[2m" : "";
const BOLD = tty ? "\x1b[1m" : "";
const GRN = tty ? "\x1b[32m" : "";
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

/** If command is `cd <dir> && …` and <dir> is the project cwd, return the rest. */
function stripImpliedCd(command: string, projectRoot: string | undefined): string {
  if (projectRoot === undefined) {
    return command;
  }
  const root = npath.normalize(projectRoot);
  const t = command.trim();
  for (const re of [
    /^cd\s+(\S+)\s*&&\s*(.*)$/s,
    /^cd\s+"([^"]+)"\s*&&\s*(.*)$/s,
    /^cd\s+'([^']+)'\s*&&\s*(.*)$/s,
  ]) {
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

function getAssistantText(message: unknown): string {
  if (typeof message !== "object" || message === null) {
    return "";
  }
  const m = message as { content?: unknown };
  if (!Array.isArray(m.content)) {
    return "";
  }
  let out = "";
  for (const part of m.content) {
    if (typeof part !== "object" || part === null) {
      continue;
    }
    const p = part as { type?: unknown; text?: unknown };
    if (p.type === "text" && typeof p.text === "string") {
      out += p.text;
    }
  }
  return out;
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

function toolStartLine(toolCall: unknown, callId: string): ToolLine {
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
    return { label: "read", detail: shortPath(p), color: BLU };
  }
  if (typeof tc.writeToolCall === "object" && tc.writeToolCall) {
    const a = (tc.writeToolCall as { args?: { path?: string } }).args;
    const p = a?.path ?? "?";
    return { label: "write", detail: shortPath(p), color: BLU };
  }
  if (typeof tc.taskToolCall === "object" && tc.taskToolCall) {
    const args = (tc.taskToolCall as { args?: Record<string, unknown> }).args;
    const s =
      firstString(args, [
        "prompt",
        "description",
        "task",
        "name",
        "instruction",
      ]) ||
      (args
        ? oneLine(
            Object.entries(args)
              .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
              .join(" "),
            120,
        )
        : "");
    return { label: "task", detail: s || id, color: MAG };
  }
  if ("function" in tc) {
    const f = tc.function as { name?: string; arguments?: string };
    const n = f.name ?? "function";
    const a = (f.arguments ?? "").slice(0, 200);
    return { label: n, detail: oneLine(a, 100), color: YLW };
  }
  const keys = Object.keys(tc);
  if (keys.length > 0) {
    const k0 = keys[0] as string;
    if (k0) {
      const v = tc[k0 as keyof typeof tc];
      const d =
        v !== null && typeof v === "object"
          ? oneLine(
              (v as { args?: unknown }).args
                ? JSON.stringify((v as { args: unknown }).args)
                : JSON.stringify(v),
              100,
            )
          : String(v);
      return { label: k0.replace(/ToolCall$/, ""), detail: d, color: YLW };
    }
  }
  return { label: "tool", detail: id, color: YLW };
}

/**
 * If set, shell `started` is only registered for a later `completed` pair; no `$` line yet
 * (avoids 3× `$` then 3× `✓` when the stream batched all starts before completes).
 */
function printToolStart(
  toolCall: unknown,
  callId: string,
  projectCwd: string | undefined,
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
      process.stderr.write(
        `\n${DIM}$${RST} ${BOLD}${cmd}${RST}\n`,
      );
      return;
    }
    if (typeof tc.taskToolCall === "object" && tc.taskToolCall) {
      const args = (tc.taskToolCall as { args?: Record<string, unknown> }).args;
      const s =
        firstString(args, [
          "prompt",
          "description",
          "task",
          "name",
          "instruction",
        ]) ||
        (args
          ? oneLine(
              Object.entries(args)
                .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
                .join(" "),
              120,
            )
          : "");
      const line = s.length > 0
        ? oneLine(s, 500)
        : (callId.length > 0 ? oneLine(callId, 50) : "…");
      // taskToolCall = parallel subagent; distinct from in-process read/shell
      process.stderr.write(
        `\n${DIM}[${RST}${MAG}subagent${DIM}]${RST}  ${line}\n`,
      );
      return;
    }
  }
  const { label, detail, color } = toolStartLine(toolCall, callId);
  process.stderr.write(
    `\n${color}· ${BOLD}${label}${RST} ${DIM}${detail}${RST}\n`,
  );
}

function formatReadSuccess(s: Record<string, unknown>): string {
  const parts: string[] = [];
  if (s.totalLines != null) {
    parts.push(String(s.totalLines) + " lines");
  }
  if (s.totalChars != null) {
    parts.push(String(s.totalChars) + " chars");
  }
  return parts.length > 0 ? parts.join(" · ") : "finished";
}

function formatWriteSuccess(s: Record<string, unknown>): string {
  const a = s.linesCreated;
  const b = s.fileSize;
  const p: string[] = [];
  if (a != null) {
    p.push(String(a) + " lines");
  }
  if (b != null) {
    p.push(String(b) + " bytes");
  }
  return p.length > 0 ? p.join(" · ") : "finished";
}

type ToolDoneHooks = { onTaskEvent?: () => void };

/** One line per tool_call completed; read / write / task (shell is paired in `printShellPaired`). */
function printToolDone(toolCall: unknown, hooks?: ToolDoneHooks): void {
  if (toolCall !== null && typeof toolCall === "object" && "taskToolCall" in toolCall) {
    hooks?.onTaskEvent?.();
  }
  if (toolCall === null || typeof toolCall !== "object") {
    process.stderr.write(`  ${DIM}· done (tool)${RST}\n`);
    return;
  }
  const o = toolCall as Record<string, unknown>;
  const r = o.readToolCall;
  if (r !== null && typeof r === "object") {
    const result = (r as { result?: { success?: Record<string, unknown> } })
      .result;
    if (result?.success) {
      const s = result.success;
      if (s !== null && typeof s === "object") {
        const detail = formatReadSuccess(s);
        process.stderr.write(
          `  ${GRN}✓${RST} ${BOLD}read${RST}  ${DIM}${detail}${RST}\n`,
        );
        return;
      }
    }
  }
  const w = o.writeToolCall;
  if (w !== null && typeof w === "object") {
    const result = (w as { result?: { success?: Record<string, unknown> } })
      .result;
    if (result?.success) {
      const s = result.success;
      if (s !== null && typeof s === "object") {
        process.stderr.write(
          `  ${GRN}✓${RST} ${BOLD}write${RST}  ${DIM}${formatWriteSuccess(s)}${RST}\n`,
        );
        return;
      }
    }
  }
  const tsk = o.taskToolCall;
  if (tsk !== null && typeof tsk === "object") {
    const result = (tsk as { result?: { success?: unknown } }).result;
    if (result != null && result.success != null) {
      process.stderr.write(
        `  ${GRN}✓${RST} ${DIM}[${MAG}subagent${DIM}]${RST}  ${DIM}finished${RST}\n`,
      );
      return;
    }
  }
  for (const key of Object.keys(o)) {
    if (
      key === "readToolCall" ||
      key === "writeToolCall" ||
      key === "shellToolCall" ||
      key === "taskToolCall"
    ) {
      continue;
    }
    const inner = o[key];
    if (inner === null || typeof inner !== "object") {
      continue;
    }
    const result = (inner as { result?: { success?: Record<string, unknown> } })
      .result;
    if (!result?.success) {
      continue;
    }
    const s = result.success;
    if (s !== null && typeof s !== "object") {
      continue;
    }
    if ("totalLines" in s) {
      process.stderr.write(
        `  ${GRN}✓${RST} ${BOLD}read${RST}  ${DIM}${formatReadSuccess(s as Record<string, unknown>)}${RST}\n`,
      );
      return;
    }
    if ("linesCreated" in s || "fileSize" in s) {
      process.stderr.write(
        `  ${GRN}✓${RST} ${BOLD}write${RST}  ${DIM}${formatWriteSuccess(s as Record<string, unknown>)}${RST}\n`,
      );
      return;
    }
    if ("exitCode" in s) {
      process.stderr.write(
        `  ${GRN}✓${RST} ${BOLD}shell${RST}  ${DIM}exit ${String(s.exitCode)}${RST}\n`,
      );
      return;
    }
  }
  process.stderr.write(`  ${DIM}· done (tool)${RST}\n`);
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

  private printShellPaired(callId: string, toolCall: unknown): void {
    const cmd = this.shellByCallId.get(callId) ?? "?";
    this.shellByCallId.delete(callId);
    if (typeof toolCall !== "object" || toolCall === null) {
      process.stderr.write(
        `\n${DIM}$${RST} ${BOLD}${cmd}${RST}\n` +
          `  ${DIM}· done (tool)${RST}\n`,
      );
      return;
    }
    const o = toolCall as Record<string, unknown>;
    const sh = o.shellToolCall;
    if (sh === null || typeof sh !== "object") {
      process.stderr.write(
        `\n${DIM}$${RST} ${BOLD}${cmd}${RST}\n` +
          `  ${DIM}· done (tool)${RST}\n`,
      );
      return;
    }
    const result = (sh as { result?: { success?: Record<string, unknown> } })
      .result;
    if (result?.success) {
      const s = result.success;
      if (s !== null && typeof s === "object" && "exitCode" in s) {
        process.stderr.write(
          `\n${DIM}$${RST} ${BOLD}${cmd}${RST}\n` +
            `  ${GRN}✓${RST} ${BOLD}shell${RST}  ${DIM}exit ${String(s.exitCode)}${RST}\n`,
        );
        return;
      }
      if (s !== null && typeof s === "object") {
        process.stderr.write(
          `\n${DIM}$${RST} ${BOLD}${cmd}${RST}\n` +
            `  ${GRN}✓${RST} ${BOLD}shell${RST}  ${DIM}done${RST}\n`,
        );
        return;
      }
    }
    process.stderr.write(
      `\n${DIM}$${RST} ${BOLD}${cmd}${RST}\n` +
        `  ${DIM}· done (tool)${RST}\n`,
    );
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
          `${DIM}${String(model)}  ·  ${shortPath(cwd, 70)}${RST}\n\n`,
        );
      } else {
        process.stderr.write(`\n${DIM}${String(model)}${RST}\n\n`);
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
      printToolStart(o.tool_call, id, this.projectCwd, (cid, command) => {
        this.shellByCallId.set(cid, command);
      });
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
          `\n${DIM}finished in ${String(ms)} ms${RST}\n\n`,
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
        process.stderr.write(
          `\n${DIM}Response${RST}\n` + `${BOLD}│${RST} `,
        );
        this.assistantStreamActive = true;
      }
      process.stderr.write(text);
      return;
    }
    if (!hasTs) {
      this.endAssistantBlock();
      process.stderr.write(
        `\n${DIM}Message${RST}\n` +
          `  ` +
          text.split("\n").join("\n  ") +
          "\n",
      );
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
