#!/usr/bin/env node

import { spawn } from "node:child_process";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import path from "node:path";
import { createInterface } from "node:readline";
import process from "node:process";

let markedConfigured = false;

function ensureMarkedConfigured() {
  if (markedConfigured) return;
  const w = process.stdout.columns;
  marked.use(
    markedTerminal({
      width: typeof w === "number" && w > 0 ? Math.max(40, w) : 80,
      reflowText: false,
    }),
  );
  markedConfigured = true;
}

/**
 * Render GitHub-flavored markdown for the terminal (ANSI via marked-terminal).
 * Respects NO_COLOR. On parse errors, returns the original string.
 * @param {string} text
 */
function renderMarkdown(text) {
  if (!text.trim()) return text;
  ensureMarkedConfigured();
  try {
    const out = marked.parse(text.trimEnd() + "\n", { async: false });
    return typeof out === "string" ? out.trimEnd() : String(out);
  } catch {
    return text;
  }
}

/** @typedef {string | Record<string, unknown>} RecordPayload */

const RESET = "\u001b[0m";
const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";

const C_SYSTEM = "\u001b[35m";
const C_USER = "\u001b[33m";
const C_ASSIST = "\u001b[32m";
const C_TOOL = "\u001b[36m";
const C_RESULT = "\u001b[34m";
const C_ERR = "\u001b[31m";

function useColor() {
  if (process.env.NO_COLOR?.trim()) return false;
  return Boolean(process.stdout.isTTY);
}

/**
 * @param {string} kind
 * @param {string} label
 * @param {string | null} [body]
 */
function paint(kind, label, body = null) {
  if (!useColor()) {
    if (body == null) return label;
    return `${label}\n${body}`;
  }
  const colors = {
    system: C_SYSTEM,
    user: C_USER,
    assistant: C_ASSIST,
    tool: C_TOOL,
    result: C_RESULT,
  };
  const c = colors[kind] ?? "";
  if (body == null) return `${c}${BOLD}${label}${RESET}`;
  return `${c}${BOLD}${label}${RESET}\n${body}`;
}

/** @param {string} key */
function toolKind(key) {
  if (key.endsWith("ToolCall")) {
    const k = key.slice(0, -"ToolCall".length).toLowerCase();
    return k || key;
  }
  return key;
}

/** @param {unknown} toolCall */
function findToolEntry(toolCall) {
  if (!toolCall || typeof toolCall !== "object" || toolCall === null)
    return null;
  const o = /** @type {Record<string, unknown>} */ (toolCall);
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object" && "args" in /** @type {object} */ (v)) {
      return [k, /** @type {Record<string, unknown>} */ (v)];
    }
  }
  return null;
}

/** @param {unknown} message */
function assistantText(message) {
  if (!message || typeof message !== "object") return "";
  const m = /** @type {Record<string, unknown>} */ (message);
  const content = m.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = /** @type {Record<string, unknown>} */ (block);
    if (b.type === "text" && "text" in b) parts.push(String(b.text));
  }
  return parts.join("");
}

const ARG_NOISE = new Set([
  "parsingResult",
  "toolCallId",
  "timeout",
  "simpleCommands",
  "hasInputRedirect",
  "hasOutputRedirect",
  "fileOutputThresholdBytes",
  "isBackground",
  "skipApproval",
  "timeoutBehavior",
  "hardTimeout",
  "closeStdin",
  "workingDirectory",
]);

/** @param {Record<string, unknown>} args @param {readonly string[]} keys */
function firstStr(args, keys) {
  for (const k of keys) {
    const v = args[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

/** @param {Record<string, unknown>} args */
function grepDetail(args) {
  let pattern = firstStr(args, [
    "pattern",
    "query",
    "search",
    "regexp",
    "regex",
    "searchTerm",
    "text",
  ]);
  if (!pattern) {
    for (const nestKey of ["search", "ripgrep", "options", "ripgrepArgs"]) {
      const nested = args[nestKey];
      if (nested && typeof nested === "object") {
        pattern = firstStr(/** @type {Record<string, unknown>} */ (nested), [
          "pattern",
          "query",
          "regexp",
          "regex",
          "search",
        ]);
        if (pattern) break;
      }
    }
  }
  let path = firstStr(args, [
    "path",
    "glob",
    "filePath",
    "relativePath",
    "cwd",
    "targetDirectory",
  ]);
  if (!path) {
    for (const k of ["paths", "pathList", "include", "files"]) {
      const v = args[k];
      if (Array.isArray(v) && v.length) {
        path = v.slice(0, 4).map(String).join(", ");
        if (v.length > 4) path += " …";
        break;
      }
    }
  }
  const bits = [];
  if (pattern) {
    const show = pattern.length <= 120 ? pattern : `${pattern.slice(0, 117)}…`;
    bits.push(JSON.stringify(show));
  }
  if (path) bits.push(path);
  if (bits.length) return bits.join(" ");

  const extra = [];
  for (const k of Object.keys(args).sort()) {
    if (ARG_NOISE.has(k)) continue;
    const v = args[k];
    if (typeof v === "string" && v.trim() && v.length < 200) {
      extra.push(`${k}=${JSON.stringify(v)}`);
    } else if (
      (typeof v === "boolean" || typeof v === "number") &&
      k !== "timeout"
    ) {
      extra.push(`${k}=${v}`);
    }
  }
  if (extra.length) return extra.slice(0, 12).join(" ");
  return "";
}

/**
 * @param {string} kind
 * @param {Record<string, unknown>} payload
 */
function toolStartedLine(kind, payload, maxCmd = 160) {
  const args = /** @type {Record<string, unknown>} */ (payload.args ?? {});
  if (kind === "read") {
    return `read ${args.path ?? ""}`;
  }
  if (kind === "shell") {
    let cmd = String(args.command ?? "")
      .trim()
      .replace(/\n/g, " ");
    if (!cmd) return "shell (empty)";
    if (cmd.length > maxCmd) cmd = `${cmd.slice(0, maxCmd - 3)}…`;
    return `shell ${cmd}`;
  }
  if (kind === "glob") {
    const pat = args.globPattern ?? args.pattern ?? args.glob ?? "";
    const root = args.targetDirectory ?? args.path ?? args.root ?? "";
    const bits = [];
    if (pat) bits.push(String(pat));
    if (root) bits.push(`@ ${root}`);
    if (bits.length) return `glob ${bits.join(" ")}`;
    return "glob";
  }
  if (kind === "grep") {
    const detail = grepDetail(args);
    return detail ? `grep ${detail}` : "grep";
  }

  const parts = [];
  for (const k of Object.keys(args).sort()) {
    if (ARG_NOISE.has(k)) continue;
    const v = args[k];
    if (typeof v === "string" && v.trim() && v.length < 120) {
      parts.push(`${k}=${JSON.stringify(v)}`);
    } else if (typeof v === "boolean" || typeof v === "number") {
      parts.push(`${k}=${v}`);
    }
  }
  if (parts.length) return `${kind} ${parts.slice(0, 10).join(" ")}`;
  return kind;
}

/** @param {number | undefined} n */
function fmtInt(n) {
  if (n === undefined || n === null) return "";
  return Number(n).toLocaleString("en-US");
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {{ meta: string; preview: string | null; truncatedNote: string | null }}
 */
function formatResultBody(obj) {
  const lines = [];
  const sub = obj.subtype ?? "?";
  const err = obj.is_error;
  const status = err ? "error" : "ok";
  const durMs = obj.duration_ms;
  const apiMs = obj.duration_api_ms;
  let durS = "?";
  if (typeof durMs === "number") durS = `${(durMs / 1000).toFixed(1)}s`;
  let apiS = "";
  if (typeof apiMs === "number" && apiMs !== durMs) {
    apiS = `  (api ${(apiMs / 1000).toFixed(1)}s)`;
  }
  lines.push(`  ${status} · ${sub} · ${durS}${apiS}`);

  const usage =
    obj.usage && typeof obj.usage === "object"
      ? /** @type {Record<string, unknown>} */ (obj.usage)
      : null;
  if (usage) {
    const inp = usage.inputTokens;
    const outT = usage.outputTokens;
    const cr = usage.cacheReadTokens;
    const cw = usage.cacheWriteTokens;
    const parts = [];
    if (inp != null) parts.push(`in ${fmtInt(/** @type {number} */ (inp))}`);
    if (outT != null) parts.push(`out ${fmtInt(/** @type {number} */ (outT))}`);
    if (cr) parts.push(`cache read ${fmtInt(/** @type {number} */ (cr))}`);
    if (cw) parts.push(`cache write ${fmtInt(/** @type {number} */ (cw))}`);
    if (parts.length) lines.push(`  tokens  ${parts.join("  ·  ")}`);
  }

  const sid = obj.session_id ?? "";
  const rid = obj.request_id ?? "";
  if (sid) lines.push(`  session  ${sid}`);
  if (rid) lines.push(`  request  ${rid}`);

  const raw = obj.result;
  if (typeof raw === "string" && raw.trim()) {
    const n = raw.length;
    lines.push("");
    lines.push(`  output  (${fmtInt(n)} characters)`);
    lines.push(`  ${"─".repeat(44)}`);
    const maxChars = 500;
    const maxLines = 14;
    const text = raw.replace(/\n$/, "");
    const fullLineCount = text ? text.split("\n").length : 0;
    const truncated = raw.length > maxChars || fullLineCount > maxLines;
    const snippet =
      text.length <= maxChars ? text : `${text.slice(0, maxChars)}…`;
    const md = renderMarkdown(snippet);
    const mdLines = md.split("\n").slice(0, maxLines);
    const preview = mdLines.join("\n");
    const truncatedNote = truncated
      ? `  … preview truncated (${fmtInt(n)} characters total)`
      : null;
    return {
      meta: lines.join("\n"),
      preview,
      truncatedNote,
    };
  }

  return { meta: lines.join("\n"), preview: null, truncatedNote: null };
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {Array<[string, RecordPayload]>}
 */
function formatRecord(obj) {
  /** @type {Array<[string, RecordPayload]>} */
  const out = [];
  const typ = obj.type;
  const sub = obj.subtype;

  if (typ === "system" && sub === "init") {
    const parts = [
      `apiKeySource=${JSON.stringify(obj.apiKeySource ?? "")}`,
      `cwd=${JSON.stringify(obj.cwd ?? "")}`,
      `session_id=${JSON.stringify(obj.session_id ?? "")}`,
      `model=${JSON.stringify(obj.model ?? "")}`,
      `permissionMode=${JSON.stringify(obj.permissionMode ?? "")}`,
    ];
    out.push(["system", parts.join(" ")]);
    return out;
  }

  if (typ === "result") {
    out.push(["result", obj]);
    return out;
  }

  if (typ === "assistant") {
    const text = assistantText(obj.message);
    if (text.trim()) out.push(["assistant", text.replace(/\s+$/, "")]);
    return out;
  }

  if (typ === "user") {
    let msg = obj.message ?? obj.text ?? "";
    let text;
    if (msg && typeof msg === "object") {
      text = assistantText(msg) || JSON.stringify(msg);
    } else {
      text = String(msg);
    }
    if (text.trim()) out.push(["user", text.replace(/\s+$/, "")]);
    return out;
  }

  if (typ === "tool_call" && sub === "started") {
    const entry = findToolEntry(obj.tool_call);
    if (!entry) return out;
    const [rawKind, payload] = entry;
    const kind = toolKind(rawKind).toLowerCase();
    const detail = toolStartedLine(kind, payload);
    out.push(["tool", detail]);
    return out;
  }

  return out;
}

/**
 * @param {string} kind
 * @param {RecordPayload} content
 */
function printRecord(kind, content) {
  if (kind === "system") {
    console.log(paint("system", `[system] ${content}`));
    return;
  }
  if (kind === "result") {
    const { meta, preview, truncatedNote } = formatResultBody(
      /** @type {Record<string, unknown>} */ (content),
    );
    if (useColor()) {
      console.log(`${C_RESULT}${BOLD}[result]${RESET}`);
      for (const line of meta.split("\n")) {
        console.log(`${DIM}${line}${RESET}`);
      }
      if (preview) {
        for (const line of preview.split("\n")) {
          console.log(`  ${line}`);
        }
      }
      if (truncatedNote) {
        console.log(`${DIM}${truncatedNote}${RESET}`);
      }
    } else {
      console.log("[result]");
      console.log(meta);
      if (preview) {
        for (const line of preview.split("\n")) {
          console.log(`  ${line}`);
        }
      }
      if (truncatedNote) console.log(truncatedNote);
    }
    return;
  }
  if (kind === "assistant") {
    console.log(
      paint(
        "assistant",
        "[assistant]",
        renderMarkdown(/** @type {string} */ (content)),
      ),
    );
    return;
  }
  if (kind === "user") {
    console.log(
      paint("user", "[user]", renderMarkdown(/** @type {string} */ (content))),
    );
    return;
  }
  if (kind === "tool") {
    console.log(paint("tool", `[tool] ${content}`));
  }
}

/** Whitespace split with single/double-quoted segments (for CURSOR_AGENT_CMD). */
function splitCommandLine(input) {
  const s = input.trim();
  if (!s) return [];
  /** @type {string[]} */
  const parts = [];
  let cur = "";
  /** @type {'"' | "'" | null} */
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur) {
        parts.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur) parts.push(cur);
  return parts;
}

/**
 * @param {import('node:stream').Readable} stream
 */
async function processStream(stream) {
  const rl = createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch (e) {
      const msg = `[parse error] ${e}: ${JSON.stringify(trimmed.slice(0, 200))}`;
      if (useColor()) console.error(`${C_ERR}${msg}${RESET}`);
      else console.error(msg);
      continue;
    }
    if (!obj || typeof obj !== "object") continue;
    const rec = /** @type {Record<string, unknown>} */ (obj);
    for (const [kind, content] of formatRecord(rec)) {
      printRecord(kind, content);
    }
  }
}

function printUsage() {
  const prog = process.argv[1]
    ? path.basename(process.argv[1])
    : "cursor_stream_chat.js";
  process.stderr.write(`Usage:
  ${prog} PROMPT [AGENT_FLAGS...]
  ${prog} -p|--prompt PROMPT [AGENT_FLAGS...]
  ... | ${prog}

Runs CURSOR_AGENT_CMD (default: agent) with -p and --output-format stream-json
unless you pass --output-format yourself.

Environment:
  CURSOR_AGENT_CMD  Command to run (quoted words ok). Default: agent
  NO_COLOR          Disable ANSI colors

`);
}

/** @param {string[]} argv */
function parseInvocation(argv) {
  if (!argv.length) throw new Error("missing prompt");
  if (argv[0] === "-p" || argv[0] === "--prompt") {
    if (argv.length < 2) throw new Error("missing prompt after -p/--prompt");
    return [argv[1], argv.slice(2)];
  }
  return [argv[0], argv.slice(1)];
}

/** @param {string[]} extra */
function hasOutputFormatFlag(extra) {
  return extra.some(
    (a) => a === "--output-format" || a.startsWith("--output-format="),
  );
}

/** @param {string} prompt @param {string[]} extra */
function buildAgentCmd(prompt, extra) {
  const raw = (process.env.CURSOR_AGENT_CMD ?? "agent").trim();
  const prefix = raw ? splitCommandLine(raw) : ["agent"];
  const flags = [...extra];
  if (!hasOutputFormatFlag(flags)) {
    flags.push("--output-format", "stream-json");
  }
  return [...prefix, "-p", prompt, ...flags];
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    if (process.stdin.isTTY) {
      printUsage();
      return 2;
    }
    await processStream(process.stdin);
    return 0;
  }
  if (argv[0] === "-h" || argv[0] === "--help") {
    printUsage();
    return 0;
  }
  let prompt;
  let extra;
  try {
    [prompt, extra] = parseInvocation(argv);
  } catch (e) {
    console.error(String(/** @type {Error} */ (e).message));
    return 2;
  }
  const cmd = buildAgentCmd(prompt, extra);
  const child = spawn(cmd[0], cmd.slice(1), {
    stdio: ["ignore", "pipe", "inherit"],
  });

  return await new Promise((resolve) => {
    let settled = false;
    function finish(code) {
      if (settled) return;
      settled = true;
      resolve(code);
    }

    child.on("error", (err) => {
      const ne = /** @type {NodeJS.ErrnoException} */ (err);
      if (ne.code === "ENOENT") {
        const exe = cmd[0] ?? "agent";
        console.error(
          `Cannot run ${JSON.stringify(exe)}: not found. Set CURSOR_AGENT_CMD or install the agent CLI.`,
        );
        finish(127);
        return;
      }
      console.error(err);
      finish(1);
    });

    if (!child.stdout) {
      finish(1);
      return;
    }

    processStream(child.stdout)
      .then(() => {
        child.once("close", (code) => finish(code ?? 0));
      })
      .catch((e) => {
        console.error(e);
        finish(1);
      });
  });
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
