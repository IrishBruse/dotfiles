const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

function noop() {
  process.stdout.write("{}");
}

function warnAgent(path, warnings, source) {
  process.stdout.write(
    JSON.stringify({
      additional_context: [
        `Style lint warning for ${path} (${source}):`,
        ...warnings.map((w) => `- ${w}`),
        "Consider fixing these in a follow-up edit if appropriate.",
      ].join("\n"),
    }),
  );
}

async function readHookInput() {
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
  return JSON.parse(raw);
}

function markdownWritePath(input) {
  const tool = input.tool_name ?? "";
  if (tool !== "Write" && tool !== "StrReplace") return null;

  const ti = input.tool_input ?? {};
  const filePath = ti.path ?? ti.file_path ?? "";
  const lower = filePath.toLowerCase();
  if (!filePath || !(lower.endsWith(".md") || lower.endsWith(".mdc"))) return null;

  return filePath;
}

async function readWrittenContent(input, filePath) {
  const cwd = input.cwd ?? process.cwd();
  try {
    return await readFile(join(cwd, filePath), "utf8");
  } catch {
    const ti = input.tool_input ?? {};
    if (input.tool_name === "Write") return ti.content ?? "";
    if (input.tool_name === "StrReplace") return ti.new_string ?? "";
    return "";
  }
}

module.exports = {
  noop,
  warnAgent,
  readHookInput,
  markdownWritePath,
  readWrittenContent,
};
