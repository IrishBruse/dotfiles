#!/usr/bin/env node
// preToolUse hook: enforce ASCII + line-wrap rules on markdown files.
// Denies Write/StrReplace that introduce non-ASCII bytes or very long
// single lines into *.md files. Runs from ~/.cursor/ (user-scope hook).

const MAX_LINE = 160;

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}

function deny(path, violations) {
  const msg = `Markdown lint (${path}): ${violations.join(" ")}`;
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: msg,
      agent_message: `${msg} Fix the violation and retry.`,
    }),
  );
}

function lintMarkdown(path, content) {
  const violations = [];

  const badChars = [];
  for (const ch of content) {
    if (ch.codePointAt(0) > 0x7f) {
      badChars.push(ch);
      if (badChars.length >= 3) break;
    }
  }
  if (badChars.length > 0) {
    const desc = badChars
      .map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`)
      .join(", ");
    violations.push(
      `non-ASCII character(s): ${desc}. Use plain ASCII (no em/en dash, no emoji).`,
    );
  }

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
    violations.push(
      `line(s) over ${MAX_LINE} chars: ${long.join(", ")}. Add a newline after "." instead of one long line.`,
    );
  }

  return violations;
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

  if (!path || !content || !path.toLowerCase().endsWith(".md")) {
    allow();
    return;
  }

  const violations = lintMarkdown(path, content);
  if (violations.length > 0) {
    deny(path, violations);
    return;
  }

  allow();
}

main().catch(() => allow());
