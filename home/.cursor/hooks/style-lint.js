#!/usr/bin/env node
// Cursor hooks: enforce global.mdc Response style on file edits and agent output.
// preToolUse (Write/StrReplace): deny non-ASCII in *.md/*.mdc, ask on prose semicolons.
// afterAgentResponse + stop: warn on response violations, one auto follow-up to fix.

const { mkdir, readFile, writeFile, unlink } = require("node:fs/promises");
const { homedir } = require("node:os");
const { join } = require("node:path");

const MAX_LINE = 160;
const STATE_DIR = join(homedir(), ".cursor", "hooks", ".state");

const UNICODE_NAMES = new Map([
  [0x2013, "en dash"],
  [0x2014, "em dash"],
  [0x2018, "left single quote"],
  [0x2019, "right single quote"],
  [0x201c, "left double quote"],
  [0x201d, "right double quote"],
  [0x2026, "ellipsis"],
  [0x00a0, "non-breaking space"],
]);

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}

function deny(path, violations) {
  const msg = `Style lint (${path}): ${violations.join(" ")}`;
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: msg,
      agent_message: `${msg} Fix the violation and retry.`,
    }),
  );
}

function ask(path, violations) {
  const msg = `Style lint (${path}): ${violations.join(" ")}`;
  process.stdout.write(
    JSON.stringify({
      permission: "ask",
      user_message: `${msg} Allow this edit anyway?`,
      agent_message: `${msg} Prefer commas over semicolons in English prose per global.mdc.`,
    }),
  );
}

function describeNonAscii(ch) {
  const cp = ch.codePointAt(0);
  const named = UNICODE_NAMES.get(cp);
  if (named) return named;
  if (cp >= 0x1f300) return "emoji";
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function stripCodeSections(text) {
  let result = text.replace(/```[\s\S]*?```/g, "");
  result = result.replace(/`[^`\n]+`/g, "");
  return result;
}

function findProseSemicolons(text) {
  const prose = stripCodeSections(text);
  const hits = [];
  const re = /[a-zA-Z][\w'']*;\s+[a-z]/g;
  let match;
  while ((match = re.exec(prose)) !== null) {
    const lineStart = prose.lastIndexOf("\n", match.index) + 1;
    const lineEnd = prose.indexOf("\n", match.index);
    const line = prose.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/https?:\/\//.test(line)) continue;
    if (/^\s*(import|export|const|let|var|function|return|class|interface|type|#include|using)\b/.test(line)) {
      continue;
    }
    hits.push(match[0].trim());
    if (hits.length >= 3) break;
  }
  return hits;
}

function lintText(content, { checkLineLength = false } = {}) {
  const violations = [];
  const enforce = [];
  const warn = [];

  const badChars = [];
  for (const ch of content) {
    if (ch.codePointAt(0) > 0x7f) {
      badChars.push(describeNonAscii(ch));
      if (badChars.length >= 3) break;
    }
  }
  if (badChars.length > 0) {
    const unique = [...new Set(badChars)];
    const msg = `non-ASCII (${unique.join(", ")}). Use plain ASCII, no emoji, no en/em dash.`;
    violations.push(msg);
    enforce.push(msg);
  }

  const semicolons = findProseSemicolons(content);
  if (semicolons.length > 0) {
    const msg = `prose semicolon(s) ("${semicolons.join('", "')}"). Prefer "," over ";" in English text.`;
    violations.push(msg);
    warn.push(msg);
  }

  if (checkLineLength) {
    const lines = content.split("\n");
    const long = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("://")) continue;
      if (/^\s*\|/.test(line)) continue;
      if (/^\s*```/.test(line)) continue;
      if (line.length > MAX_LINE) {
        long.push(i + 1);
        if (long.length >= 3) break;
      }
    }
    if (long.length > 0) {
      const msg = `line(s) over ${MAX_LINE} chars: ${long.join(", ")}. Add a newline after "." instead of one long line.`;
      violations.push(msg);
      enforce.push(msg);
    }
  }

  return { violations, enforce, warn };
}

function lintMarkdown(path, content) {
  return lintText(content, { checkLineLength: true });
}

function statePath(conversationId) {
  const safe = (conversationId ?? "unknown").replace(/[^\w.-]/g, "_");
  return join(STATE_DIR, `${safe}.json`);
}

async function saveResponseViolations(conversationId, result) {
  if (!conversationId || result.violations.length === 0) return;
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(
    statePath(conversationId),
    JSON.stringify({
      violations: result.violations,
      enforce: result.enforce,
      warn: result.warn,
      at: Date.now(),
    }),
    "utf8",
  );
}

async function loadResponseViolations(conversationId) {
  try {
    const raw = await readFile(statePath(conversationId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function clearResponseViolations(conversationId) {
  try {
    await unlink(statePath(conversationId));
  } catch {
    // ignore missing state
  }
}

async function handlePreToolUse(input) {
  const tool = input.tool_name ?? "";
  const ti = input.tool_input ?? {};
  const path = ti.path ?? ti.file_path ?? "";
  let content = "";
  if (tool === "Write") {
    content = ti.content ?? "";
  } else if (tool === "StrReplace") {
    content = ti.new_string ?? "";
  } else {
    allow();
    return;
  }

  const lower = path.toLowerCase();
  if (!path || !content || !(lower.endsWith(".md") || lower.endsWith(".mdc"))) {
    allow();
    return;
  }

  const result = lintMarkdown(path, content);
  if (result.enforce.length > 0) {
    deny(path, result.enforce);
    return;
  }
  if (result.warn.length > 0) {
    ask(path, result.warn);
    return;
  }

  allow();
}

async function handleAfterAgentResponse(input) {
  const text = input.text ?? "";
  const conversationId = input.conversation_id ?? input.session_id ?? "";
  const result = lintText(text);

  if (result.violations.length > 0) {
    await saveResponseViolations(conversationId, result);
    console.error(
      `[style-lint] Response style: ${result.violations.join(" ")}`,
    );
  } else {
    await clearResponseViolations(conversationId);
  }

  process.stdout.write("{}");
}

async function handleStop(input) {
  const conversationId = input.conversation_id ?? input.session_id ?? "";
  const status = input.status ?? "completed";
  const loopCount = input.loop_count ?? 0;

  const saved = await loadResponseViolations(conversationId);
  await clearResponseViolations(conversationId);

  if (
    status === "completed" &&
    loopCount === 0 &&
    saved &&
    saved.enforce &&
    saved.enforce.length > 0
  ) {
    const summary = saved.enforce.join(" ");
    process.stdout.write(
      JSON.stringify({
        followup_message: [
          "Your last assistant message violated global.mdc Response style rules:",
          summary,
          "Rewrite your previous answer in plain ASCII with no emoji and no en/em dash.",
          "Prefer commas over semicolons in English prose.",
        ].join(" "),
      }),
    );
    return;
  }

  if (saved?.warn?.length > 0) {
    console.error(
      `[style-lint] Response style (warn only): ${saved.warn.join(" ")}`,
    );
  }

  process.stdout.write("{}");
}

async function main() {
  let input;
  try {
    const raw = await new Promise((resolve, reject) => {
      const chunks = [];
      process.stdin.on("data", (chunk) => chunks.push(chunk));
      process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      process.stdin.on("error", reject);
    });
    input = JSON.parse(raw);
  } catch {
    allow();
    return;
  }

  const event = input.hook_event_name ?? "preToolUse";

  try {
    if (event === "afterAgentResponse") {
      await handleAfterAgentResponse(input);
      return;
    }
    if (event === "stop") {
      await handleStop(input);
      return;
    }
    await handlePreToolUse(input);
  } catch (err) {
    console.error("[style-lint] hook error:", err);
    if (event === "preToolUse") {
      allow();
    } else {
      process.stdout.write("{}");
    }
  }
}

main();
