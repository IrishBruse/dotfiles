import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const DEFAULT_CURSOR_DIR = join(process.env.HOME ?? "", ".cursor");
const DEFAULT_OUT_DIR = "cursor-chats-export";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; name: string; input: Record<string, unknown> };

type TranscriptLine = {
  role: string;
  message?: { content?: ContentBlock[] };
};

type ChatMeta = {
  id: string;
  project: string;
  scope: string;
  sourcePath: string;
  mtimeMs: number;
};

function parseArgs(argv: string[]): { cursorDir: string; outDir: string } {
  let cursorDir = DEFAULT_CURSOR_DIR;
  let outDir = DEFAULT_OUT_DIR;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--cursor-dir" && argv[i + 1]) {
      cursorDir = argv[++i];
      continue;
    }
    if (arg === "--out" && argv[i + 1]) {
      outDir = argv[++i];
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(`Usage: export-cursor-chats [--out DIR] [--cursor-dir DIR]

Exports Cursor agent transcripts from ~/.cursor/projects/*/agent-transcripts/
into one markdown file per chat.

Options:
  --out DIR         Output directory (default: ${DEFAULT_OUT_DIR})
  --cursor-dir DIR  Cursor data root (default: ~/.cursor)
`);
      process.exit(0);
    }
  }

  return { cursorDir, outDir };
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 60) || "chat";
}

function projectLabel(projectDir: string): string {
  const name = basename(projectDir);
  if (name.startsWith("home-econn-git-")) {
    return name.slice("home-econn-git-".length);
  }
  if (name.startsWith("home-econn-")) {
    return name.slice("home-econn-".length);
  }
  return name;
}

function stripUserQuery(text: string): string {
  const match = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  const body = match ? match[1] : text;
  return body
    .replace(/\[Image(?:\s+#\d+)?\]/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanAssistantText(text: string): string {
  return text
    .replace(/\n?\[REDACTED\]\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function summarizeToolInput(
  name: string,
  input: Record<string, unknown>
): string {
  if (name === "Shell" && typeof input.command === "string") {
    return input.command.replace(/\s+/g, " ").trim();
  }
  if (name === "Read" && typeof input.path === "string") {
    return input.path;
  }
  if (name === "Grep" && typeof input.pattern === "string") {
    const path = typeof input.path === "string" ? ` in ${input.path}` : "";
    return `${input.pattern}${path}`;
  }
  if (name === "Glob" && typeof input.glob_pattern === "string") {
    return input.glob_pattern;
  }
  if (name === "Write" || name === "StrReplace") {
    if (typeof input.path === "string") {
      return input.path;
    }
  }
  const keys = [
    "path",
    "pattern",
    "command",
    "glob_pattern",
    "url",
    "description"
  ];
  for (const key of keys) {
    if (typeof input[key] === "string") {
      return input[key];
    }
  }
  return JSON.stringify(input);
}

function formatToolUses(blocks: ContentBlock[]): string[] {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type !== "tool_use") {
      continue;
    }
    lines.push(
      `- **${block.name}**: \`${summarizeToolInput(block.name, block.input)}\``
    );
  }
  return lines;
}

function firstUserTitle(lines: TranscriptLine[]): string {
  for (const line of lines) {
    if (line.role !== "user" || !line.message?.content) {
      continue;
    }
    for (const block of line.message.content) {
      if (block.type !== "text") {
        continue;
      }
      const text = stripUserQuery(block.text);
      if (text.length > 0) {
        const firstLine = text.split("\n")[0]?.trim() ?? text;
        return firstLine.slice(0, 120);
      }
    }
  }
  return "Untitled chat";
}

function chatToMarkdown(meta: ChatMeta, lines: TranscriptLine[]): string {
  const title = firstUserTitle(lines);
  const exported = new Date(meta.mtimeMs).toISOString();

  const parts: string[] = [
    "---",
    `id: ${meta.id}`,
    `project: ${meta.project}`,
    `scope: ${meta.scope}`,
    `exported: ${exported}`,
    `source: ${meta.sourcePath}`,
    "---",
    "",
    `# ${title}`,
    ""
  ];

  for (const line of lines) {
    const blocks = line.message?.content ?? [];
    if (blocks.length === 0) {
      continue;
    }

    const roleLabel =
      line.role === "user"
        ? "User"
        : line.role === "assistant"
          ? "Assistant"
          : line.role;

    if (line.role === "user") {
      const texts = blocks
        .filter(
          (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text"
        )
        .map((b) => stripUserQuery(b.text))
        .filter((t) => t.length > 0);
      if (texts.length === 0) {
        continue;
      }
      parts.push(`## ${roleLabel}`, "", texts.join("\n\n"), "");
      continue;
    }

    if (line.role === "assistant") {
      const texts = blocks
        .filter(
          (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text"
        )
        .map((b) => cleanAssistantText(b.text))
        .filter((t) => t.length > 0);

      const tools = formatToolUses(blocks);

      if (texts.length === 0 && tools.length === 0) {
        continue;
      }

      parts.push(`## ${roleLabel}`, "");
      if (texts.length > 0) {
        parts.push(texts.join("\n\n"), "");
      }
      if (tools.length > 0) {
        parts.push("### Tools", "", ...tools, "");
      }
      continue;
    }

    const raw = blocks
      .filter(
        (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text"
      )
      .map((b) => b.text)
      .join("\n\n");
    if (raw.length > 0) {
      parts.push(`## ${roleLabel}`, "", raw, "");
    }
  }

  return `${parts.join("\n").trimEnd()}\n`;
}

async function walkJsonlFiles(dir: string, files: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkJsonlFiles(full, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(full);
    }
  }
}

async function findTranscriptFiles(cursorDir: string): Promise<string[]> {
  const projectsDir = join(cursorDir, "projects");
  const projects = await readdir(projectsDir, { withFileTypes: true });
  const files: string[] = [];

  for (const project of projects) {
    if (!project.isDirectory()) {
      continue;
    }
    const transcriptsDir = join(projectsDir, project.name, "agent-transcripts");
    await walkJsonlFiles(transcriptsDir, files);
  }

  return files;
}

function chatScope(sourcePath: string): string {
  if (sourcePath.includes("/subagents/")) {
    return "subagent";
  }
  return "chat";
}

function parseTranscript(raw: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  for (const row of raw.split("\n")) {
    const trimmed = row.trim();
    if (trimmed.length === 0) {
      continue;
    }
    lines.push(JSON.parse(trimmed) as TranscriptLine);
  }
  return lines;
}

async function main(): Promise<void> {
  const { cursorDir, outDir } = parseArgs(process.argv);
  const transcriptFiles = await findTranscriptFiles(cursorDir);

  await mkdir(outDir, { recursive: true });

  const indexRows: string[] = [];
  let written = 0;

  for (const sourcePath of transcriptFiles) {
    const id = basename(sourcePath, ".jsonl");
    const parts = sourcePath.split("/projects/");
    const projectDir = parts[1]?.split("/")[0] ?? "unknown";
    const project = projectLabel(projectDir);
    const scope = chatScope(sourcePath);
    const fileStat = await stat(sourcePath);
    const raw = await readFile(sourcePath, "utf8");
    const lines = parseTranscript(raw);
    const title = firstUserTitle(lines);
    const slug = slugify(title);
    const scopePrefix = scope === "subagent" ? "subagent-" : "";
    const filename = `${scopePrefix}${project}-${slug}-${id.slice(0, 8)}.md`;
    const outPath = join(outDir, filename);

    const meta: ChatMeta = {
      id,
      project,
      scope,
      sourcePath,
      mtimeMs: fileStat.mtimeMs
    };

    await writeFile(outPath, chatToMarkdown(meta, lines), "utf8");
    indexRows.push(
      `| ${exportedDate(fileStat.mtimeMs)} | ${project} | ${scope} | [${escapeMd(title)}](${filename}) | \`${id}\` |`
    );
    written += 1;
  }

  indexRows.sort();
  const index = [
    "# Cursor chat export",
    "",
    `Exported ${written} chats from \`${cursorDir}\`.`,
    "",
    "| Modified | Project | Scope | Title | ID |",
    "| --- | --- | --- | --- | --- |",
    ...indexRows,
    ""
  ].join("\n");

  await writeFile(join(outDir, "index.md"), index, "utf8");

  console.log(`Wrote ${written} chats to ${outDir}/`);
  console.log(`Index: ${join(outDir, "index.md")}`);
}

function exportedDate(mtimeMs: number): string {
  return new Date(mtimeMs).toISOString().slice(0, 10);
}

function escapeMd(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\[/g, "\\[");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
