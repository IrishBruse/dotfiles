/**
 * Formats Cursor CLI stream-json (NDJSON) to stderr.
 * @see https://www.cursor.com/docs/cli/reference/output-format
 */

import process from "node:process";
import * as npath from "node:path";

const tty = process.stderr.isTTY === true;
const CY = tty ? "\x1b[36m" : "";
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

/** Shorten paths and agent-tools file names for display */
function shortPath(p: string, max = 64): string {
  if (p.length <= max) {
    return p;
  }
  const base = npath.basename(p);
  if (base.length > 0 && base.length < max) {
    const dir = npath.dirname(p);
    if (dir.length < 8) {
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

function toolStartLine(toolCall: unknown, callId: string): ToolLine {
  const id = callId.length > 12 ? `${callId.slice(0, 12)}…` : callId;
  if (toolCall === null || typeof toolCall !== "object") {
    return { label: "tool", detail: id, color: YLW };
  }
  const tc = toolCall as Record<string, unknown>;

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
  if (typeof tc.shellToolCall === "object" && tc.shellToolCall) {
    const args = (tc.shellToolCall as { args?: Record<string, unknown> }).args;
    const s =
      firstString(args, ["command", "script", "line"]) ||
      (args
        ? oneLine(
            Object.entries(args)
              .map(([, v]) => String(v))
              .join(" "),
            100,
          )
        : "");
    return {
      label: "shell",
      detail: s || id,
      color: YLW,
    };
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

function printToolStart(toolCall: unknown, callId: string): void {
  const { label, detail, color } = toolStartLine(toolCall, callId);
  process.stderr.write(
    `\n${color}▶ ${BOLD}${label}${RST} ${DIM}${detail}${RST}\n`,
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
  return parts.length > 0 ? parts.join(" · ") : "done";
}

function formatWriteSuccess(s: Record<string, unknown>): string {
  const a = s.linesCreated;
  const b = s.fileSize;
  const p: string[] = ["wrote"];
  if (a !== undefined) {
    p.push(String(a) + " lines");
  }
  if (b !== undefined) {
    p.push(String(b) + " bytes");
  }
  return p.length > 1 ? p.join(" · ") : "wrote file";
}

function printToolDone(toolCall: unknown): void {
  if (toolCall === null || typeof toolCall !== "object") {
    process.stderr.write(`  ${GRN}ok${RST}\n`);
    return;
  }
  const o = toolCall as Record<string, unknown>;
  for (const key of Object.keys(o)) {
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
    if ("totalLines" in s) {
      process.stderr.write(
        `  ${GRN}ok${RST}  ${DIM}${formatReadSuccess(s)}${RST}\n`,
      );
      return;
    }
    if ("linesCreated" in s) {
      process.stderr.write(
        `  ${GRN}ok${RST}  ${DIM}${formatWriteSuccess(s)}${RST}\n`,
      );
      return;
    }
    if ("exitCode" in s) {
      process.stderr.write(
        `  ${GRN}ok${RST}  ${DIM}exit ${String(s.exitCode)}${RST}\n`,
      );
      return;
    }
  }
  process.stderr.write(`  ${GRN}ok${RST}\n`);
}

export class AgentStreamHandler {
  private lastResult: string | undefined;
  private resultError: string | undefined;
  private assistantStreamActive = false;

  handleObject(ev: unknown): void {
    if (typeof ev !== "object" || ev === null) {
      return;
    }
    const o = ev as Record<string, unknown>;
    const typ = o.type;
    if (typ === "system" && o.subtype === "init") {
      const model = o.model;
      const cwd = o.cwd;
      process.stderr.write(
        `${CY}━━ pr-cli · ${String(model)}${RST}\n` +
          `${DIM}   ${String(cwd)}${RST}\n\n`,
      );
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
      printToolStart(o.tool_call, id);
      return;
    }
    if (typ === "tool_call" && o.subtype === "completed") {
      printToolDone(o.tool_call);
      return;
    }
    if (typ === "result" && o.is_error === true) {
      this.endAssistantBlock();
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
      const r = o.result;
      if (typeof r === "string") {
        this.lastResult = r;
        const ms = o.duration_ms;
        process.stderr.write(
          `\n${CY}── finished in ${String(ms)} ms${RST}\n\n`,
        );
      }
    }
  }

  /**
   * Streaming: print one header then append text only (no prefix per token).
   * See Cursor output-format partial-output rules.
   */
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
