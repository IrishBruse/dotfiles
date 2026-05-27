import process from "node:process";

import { markdown } from "../markdown/api.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const INDENT = "  ";
const TOOL_NAME_WIDTH = 10;
const MAX_SUMMARY = 120;
const MAX_STDOUT_PREVIEW = 3;

type StreamEvent = {
  type?: string;
  subtype?: string;
  text?: string;
  model?: string;
  cwd?: string;
  duration_ms?: number;
  is_error?: boolean;
  result?: string;
  message?: {
    role?: string;
    content?: Array<{ type?: string; text?: string }>;
  };
  tool_call?: Record<string, unknown>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
  };
};

type ToolCallPayload = {
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

type ViewState = {
  thinkingBuffer: string;
  assistantRendered: boolean;
};

export type AgentStreamRenderer = {
  onLine(line: string): void;
  flush(): void;
};

export function createAgentStreamRenderer(): AgentStreamRenderer {
  const color = process.stdout.isTTY === true;
  const state: ViewState = { thinkingBuffer: "", assistantRendered: false };

  return {
    onLine(line: string) {
      renderStreamJsonLine(line, state, color);
    },
    flush() {
      flushThinking(state);
    }
  };
}

function renderStreamJsonLine(
  rawLine: string,
  state: ViewState,
  color: boolean
): void {
  const trimmed = rawLine.trim();
  if (trimmed === "") {
    return;
  }

  let event: StreamEvent;
  try {
    event = JSON.parse(trimmed) as StreamEvent;
  } catch {
    writeLine(paint(color, DIM, `${INDENT}? ${trimmed.slice(0, MAX_SUMMARY)}`));
    return;
  }

  const type = event.type ?? "unknown";

  switch (type) {
    case "system":
      renderSystem(event, color);
      return;
    case "user":
      return;
    case "thinking":
      renderThinking(event, state);
      return;
    case "tool_call":
      flushThinking(state);
      renderToolCall(event, color);
      return;
    case "assistant":
      flushThinking(state);
      renderAssistant(event, state);
      return;
    case "result":
      flushThinking(state);
      renderResult(event, color);
      return;
    default:
      writeLine(
        paint(
          color,
          DIM,
          `${INDENT}· ${type}${event.subtype ? `/${event.subtype}` : ""}`
        )
      );
  }
}

function renderSystem(event: StreamEvent, color: boolean): void {
  if (event.subtype !== "init") {
    return;
  }
  const model = event.model ?? "agent";
  const cwd = shortenPath(event.cwd ?? "");
  const where = cwd === "" ? "" : paint(color, DIM, `  ${cwd}`);
  writeLine(
    `${INDENT}${paint(color, CYAN, "*")} ${paint(color, BOLD, model)}${where}`
  );
}

function renderThinking(event: StreamEvent, state: ViewState): void {
  if (event.subtype === "completed") {
    flushThinking(state);
    return;
  }
  if (event.subtype !== "delta" || event.text === undefined) {
    return;
  }
  state.thinkingBuffer += event.text;
}

function flushThinking(state: ViewState): void {
  const text = state.thinkingBuffer.trim();
  state.thinkingBuffer = "";
  if (text === "") {
    return;
  }
  writeLine(`${INDENT}~ thinking`);
  writeMarkdownBlock(text);
  writeLine("");
}

function renderAssistant(event: StreamEvent, state: ViewState): void {
  const text = extractMessageText(event.message);
  if (text === "") {
    return;
  }
  if (!state.assistantRendered) {
    writeLine("");
    state.assistantRendered = true;
  }
  writeMarkdownBlock(text);
}

function renderToolCall(event: StreamEvent, color: boolean): void {
  const parsed = parseToolCall(event.tool_call);
  if (parsed === null) {
    return;
  }

  const summary = summarizeToolArgs(parsed.name, parsed.payload.args);

  if (event.subtype === "started") {
    writeLine(formatToolRow(">", parsed.name, summary, color, YELLOW));
    return;
  }

  if (event.subtype !== "completed") {
    return;
  }

  const outcome = toolOutcome(parsed.name, parsed.payload.result);
  const mark = outcome.ok ? "+" : "x";
  const markColor = outcome.ok ? GREEN : RED;
  const detail = outcome.detail === "" ? "" : outcome.detail;
  writeLine(formatToolRow(mark, parsed.name, detail, color, markColor));

  if (outcome.preview !== "") {
    const preview = markdown(
      ["```", outcome.preview, "```"].join("\n")
    );
    for (const line of preview.split("\n").slice(0, MAX_STDOUT_PREVIEW + 2)) {
      writeLine(line === "" ? "" : `${INDENT}  ${line}`);
    }
    if (outcome.preview.split("\n").length > MAX_STDOUT_PREVIEW) {
      writeLine(paint(color, DIM, `${INDENT}  ...`));
    }
  }
}

function renderResult(event: StreamEvent, color: boolean): void {
  const ok = event.is_error !== true && event.subtype === "success";
  const mark = ok ? "+" : "x";
  const markColor = ok ? GREEN : RED;
  const parts: string[] = [];
  if (event.duration_ms !== undefined) {
    parts.push(formatMs(event.duration_ms));
  }
  const usage = formatUsage(event.usage);
  if (usage !== "") {
    parts.push(usage);
  }
  writeLine(formatToolRow(mark, "done", parts.join("  "), color, markColor));
  writeLine("");
}

function formatToolRow(
  mark: string,
  name: string,
  detail: string,
  color: boolean,
  markColor: string
): string {
  const markPart = paint(color, markColor, mark);
  const namePart = paint(color, BOLD, padField(name, TOOL_NAME_WIDTH));
  const detailPart =
    detail === "" ? "" : ` ${paint(color, DIM, truncate(detail))}`;
  return `${INDENT}${markPart} ${namePart}${detailPart}`;
}

function writeMarkdownBlock(source: string): void {
  const rendered = markdown(source.trimEnd());
  for (const line of rendered.split("\n")) {
    writeLine(line === "" ? "" : `${INDENT}${line}`);
  }
}

function parseToolCall(
  toolCall: Record<string, unknown> | undefined
): { name: string; payload: ToolCallPayload } | null {
  if (toolCall === undefined) {
    return null;
  }
  for (const [key, value] of Object.entries(toolCall)) {
    if (!key.endsWith("ToolCall") || typeof value !== "object" || value === null) {
      continue;
    }
    const raw = value as Record<string, unknown>;
    const name = formatToolName(key.replace(/ToolCall$/, ""));
    const payload: ToolCallPayload = {};
    if (typeof raw.args === "object" && raw.args !== null) {
      payload.args = raw.args as Record<string, unknown>;
    }
    if (typeof raw.result === "object" && raw.result !== null) {
      payload.result = raw.result as Record<string, unknown>;
    }
    return { name, payload };
  }
  return null;
}

function formatToolName(raw: string): string {
  if (raw === "") {
    return "tool";
  }
  return raw.charAt(0).toLowerCase() + raw.slice(1);
}

function summarizeToolArgs(
  name: string,
  args: Record<string, unknown> | undefined
): string {
  if (args === undefined) {
    return "";
  }
  if (name === "shell" && typeof args.command === "string") {
    return args.command.replace(/\s+/g, " ").trim();
  }
  if (
    (name === "read" ||
      name === "write" ||
      name === "strReplace" ||
      name === "delete") &&
    typeof args.path === "string"
  ) {
    return shortenPath(args.path);
  }
  if (name === "grep" && typeof args.pattern === "string") {
    const where =
      typeof args.path === "string" ? ` in ${shortenPath(args.path)}` : "";
    return `${args.pattern}${where}`;
  }
  if (name === "glob") {
    const pattern = stringArg(args, "glob_pattern", "globPattern");
    const dir = shortenPath(
      stringArg(args, "target_directory", "targetDirectory") ?? ""
    );
    if (pattern !== "" && dir !== "") {
      return `${pattern} in ${dir}`;
    }
    if (pattern !== "") {
      return pattern;
    }
    if (dir !== "") {
      return dir;
    }
  }
  if (typeof args.description === "string") {
    return args.description;
  }
  if (typeof args.url === "string") {
    return args.url;
  }
  const keys = ["path", "pattern", "command", "glob_pattern", "globPattern", "url"];
  for (const key of keys) {
    if (typeof args[key] === "string") {
      return key.includes("path") || key.includes("Directory")
        ? shortenPath(args[key])
        : args[key];
    }
  }
  return truncate(JSON.stringify(args));
}

function stringArg(
  args: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    if (typeof args[key] === "string") {
      return args[key];
    }
  }
  return "";
}

function toolOutcome(
  name: string,
  result: Record<string, unknown> | undefined
): { ok: boolean; detail: string; preview: string } {
  if (result === undefined) {
    return { ok: true, detail: "", preview: "" };
  }

  if (name === "shell") {
    const success = result.success as Record<string, unknown> | undefined;
    const error = result.error as Record<string, unknown> | undefined;
    if (success !== undefined) {
      const exitCode =
        typeof success.exitCode === "number" ? success.exitCode : undefined;
      const ms =
        typeof success.executionTime === "number"
          ? success.executionTime
          : typeof success.localExecutionTimeMs === "number"
            ? success.localExecutionTimeMs
            : undefined;
      const timing = ms === undefined ? "" : formatMs(ms);
      const code =
        exitCode === undefined || exitCode === 0
          ? ""
          : `exit ${String(exitCode)}`;
      const detail = [timing, code].filter((s) => s !== "").join("  ");
      const stdout =
        typeof success.stdout === "string" ? success.stdout.trim() : "";
      return {
        ok: exitCode === undefined || exitCode === 0,
        detail,
        preview: stdout
      };
    }
    if (error !== undefined) {
      const msg =
        typeof error.message === "string" ? error.message : "command failed";
      return { ok: false, detail: msg, preview: "" };
    }
  }

  const rejected = result.rejected as Record<string, unknown> | undefined;
  if (rejected !== undefined) {
    const reason =
      typeof rejected.reason === "string" ? rejected.reason : "rejected";
    return { ok: false, detail: reason, preview: "" };
  }

  const error = result.error as Record<string, unknown> | undefined;
  if (error !== undefined) {
    const msg =
      typeof error.message === "string" ? error.message : "tool error";
    return { ok: false, detail: msg, preview: "" };
  }

  return { ok: true, detail: "", preview: "" };
}

function extractMessageText(message: StreamEvent["message"]): string {
  const blocks = message?.content ?? [];
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("").trimEnd();
}

function formatUsage(usage: StreamEvent["usage"]): string {
  if (usage === undefined) {
    return "";
  }
  const parts: string[] = [];
  if (typeof usage.inputTokens === "number") {
    parts.push(`${formatTokens(usage.inputTokens)} in`);
  }
  if (typeof usage.outputTokens === "number") {
    parts.push(`${formatTokens(usage.outputTokens)} out`);
  }
  if (
    typeof usage.cacheReadTokens === "number" &&
    usage.cacheReadTokens > 0
  ) {
    parts.push(`${formatTokens(usage.cacheReadTokens)} cache`);
  }
  return parts.join(" / ");
}

function formatTokens(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}

function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${String(Math.round(ms))}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function shortenPath(p: string): string {
  const home = process.env.HOME ?? "";
  if (home !== "" && p.startsWith(home)) {
    return `~${p.slice(home.length)}`;
  }
  return p;
}

function truncate(text: string): string {
  if (text.length <= MAX_SUMMARY) {
    return text;
  }
  return `${text.slice(0, MAX_SUMMARY - 1)}…`;
}

function padField(text: string, width: number): string {
  if (text.length >= width) {
    return text.slice(0, width - 1) + "…";
  }
  return text.padEnd(width);
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") {
    return text;
  }
  return `${code}${text}${RESET}`;
}

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}
