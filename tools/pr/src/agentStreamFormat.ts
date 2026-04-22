/**
 * Formats Cursor CLI stream-json (NDJSON) to stderr.
 * @see https://www.cursor.com/docs/cli/reference/output-format
 *
 * Thinking events are not emitted in print mode; streaming assistant
 * (partial) output is shown as the model “thinks out loud” before tool calls.
 */

import process from "node:process";

const tty = process.stderr.isTTY === true;
const CY = tty ? "\x1b[36m" : "";
const DIM = tty ? "\x1b[2m" : "";
const BOLD = tty ? "\x1b[1m" : "";
const GRN = tty ? "\x1b[32m" : "";
const YLW = tty ? "\x1b[33m" : "";
const RST = tty ? "\x1b[0m" : "";

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

function describeToolStart(
  toolCall: unknown,
  callId: string,
): void {
  const idShort = callId.length > 10 ? `${callId.slice(0, 10)}…` : callId;
  if (toolCall === null || typeof toolCall !== "object") {
    process.stderr.write(
      `\n${YLW}▸${RST} tool ${DIM}${idShort}${RST}\n`,
    );
    return;
  }
  const tc = toolCall as Record<string, unknown>;
  if ("readToolCall" in tc && typeof tc.readToolCall === "object" && tc.readToolCall) {
    const a = (tc.readToolCall as { args?: { path?: string } }).args;
    const path = a?.path ?? "?";
    process.stderr.write(
      `\n${YLW}▸${RST} read ${BOLD}${path}${RST} ${DIM}${idShort}${RST}\n`,
    );
    return;
  }
  if ("writeToolCall" in tc && typeof tc.writeToolCall === "object" && tc.writeToolCall) {
    const a = (tc.writeToolCall as { args?: { path?: string } }).args;
    const path = a?.path ?? "?";
    process.stderr.write(
      `\n${t(YLW)}▸${RST} write ${BOLD}${path}${RST} ${t(DIM)}${idShort}${RST}\n`,
    );
    return;
  }
  if ("function" in tc) {
    const f = tc.function as { name?: string; arguments?: string };
    const n = f.name ?? "function";
    const args = (f.arguments ?? "").slice(0, 200);
    process.stderr.write(
      `\n${t(YLW)}▸${RST} ${BOLD}${n}${RST}${args ? ` ${t(DIM)}${args}${RST}` : ""}\n`,
    );
    return;
  }
  const keys = Object.keys(tc);
  const label = keys[0] ?? "tool";
  process.stderr.write(
    `\n${t(YLW)}▸${RST} ${BOLD}${label}${RST} ${t(DIM)}${idShort}${RST}\n`,
  );
}

function printToolDone(toolCall: unknown): void {
  if (toolCall === null || typeof toolCall !== "object") {
    process.stderr.write(`  ${t(GRN)}✓${RST}\n`);
    return;
  }
  const o = toolCall as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    const inner = o[k];
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
        `  ${t(GRN)}✓${RST} read ${t(DIM)}${String(s.totalLines)} lines · ${String(
          s.totalChars,
        )} chars${RST}\n`,
      );
      return;
    }
    if ("linesCreated" in s) {
      process.stderr.write(
        `  ${t(GRN)}✓${RST} wrote ${t(DIM)}${String(s.linesCreated)} lines · ${
          String(s.fileSize)
        } bytes${RST}\n`,
      );
      return;
    }
  }
  process.stderr.write(`  ${t(GRN)}✓${RST}\n`);
}

export class AgentStreamHandler {
  private lastResult: string | undefined;
  private pendingAssistantText = false;

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
        `${t(CY)}━━ agent ━━${RST} ${BOLD}${String(model)}${RST}  ${DIM}${String(
          cwd,
        )}${RST}\n\n`,
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
      this.newlineIfMidAssistant();
      const id =
        typeof o.call_id === "string" ? o.call_id : String(o.call_id ?? "…");
      describeToolStart(o.tool_call, id);
      return;
    }
    if (typ === "tool_call" && o.subtype === "completed") {
      printToolDone(o.tool_call);
      return;
    }
    if (typ === "result" && o.is_error === false) {
      this.newlineIfMidAssistant();
      const r = o.result;
      if (typeof r === "string") {
        this.lastResult = r;
        const ms = o.duration_ms;
        process.stderr.write(
          `\n${t(CY)}━━ done (${String(ms)} ms) ━━${RST}\n\n`,
        );
      }
    }
  }

  /**
   * Partial-output rules: append only when timestamp_ms is set and model_call_id
   * is not (true streaming delta).
   */
  private handleAssistant(o: Record<string, unknown>): void {
    const hasTs = "timestamp_ms" in o;
    const hasMc = Boolean(o.model_call_id);
    if (!hasTs) {
      return; // end flush duplicate, or other
    }
    if (hasMc) {
      return; // pre-tool buffer duplicate
    }
    const text = getAssistantText(o.message);
    if (text.length === 0) {
      return;
    }
    this.pendingAssistantText = true;
    process.stderr.write(`${t(DIM)}│${RST} ${text}`);
  }

  private newlineIfMidAssistant(): void {
    if (this.pendingAssistantText) {
      process.stderr.write("\n");
      this.pendingAssistantText = false;
    }
  }

  getFinalResult(): string {
    if (this.lastResult === undefined) {
      throw new Error("stream ended without a success result line");
    }
    return this.lastResult;
  }
}
