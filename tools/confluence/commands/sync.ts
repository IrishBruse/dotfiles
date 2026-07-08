import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { fetchPageSyncMeta } from "../lib/api.ts";
import { parsePageMarkdown } from "../lib/local.ts";
import { printError } from "../lib/output.ts";
import { decideSync, pageChangeState } from "../lib/page-state.ts";
import { pullSingle } from "./pull.ts";
import { pushPage } from "./push.ts";

function resolveMarkdownPath(input: string, cwd: string): string | null {
  const resolved = path.resolve(cwd, input);
  if (!resolved.endsWith(".md")) {
    printError("sync: path must be a .md file");
    return null;
  }
  if (!fs.existsSync(resolved)) {
    printError(`sync: file not found: ${input}`);
    return null;
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    printError(`sync: not a file: ${input}`);
    return null;
  }
  return resolved;
}

/** Pull or push one local markdown file based on frontmatter and remote state. */
export async function runSync(
  input: string,
  cwd = process.cwd(),
  options: { quiet?: boolean } = {}
): Promise<number> {
  const filePath = resolveMarkdownPath(input, cwd);
  if (!filePath) return 1;

  const content = fs.readFileSync(filePath, "utf-8");
  const page = parsePageMarkdown(content, filePath, cwd);
  if (!page) {
    printError(`sync: could not parse Confluence frontmatter: ${input}`);
    return 1;
  }

  let remoteVersion = 0;
  let remoteUpdatedAt: string | undefined;
  try {
    const meta = await fetchPageSyncMeta(page.id);
    remoteVersion = meta.version;
    remoteUpdatedAt = meta.updatedAt;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`sync ${page.id}: ${msg}`);
    return 1;
  }

  const state = pageChangeState(
    page.version,
    remoteVersion,
    page.syncedHash,
    page.body
  );
  const fileMtimeMs = fs.statSync(filePath).mtimeMs;
  const decision = decideSync(state, fileMtimeMs, remoteUpdatedAt);

  if (decision === "links") {
    printError(
      `sync: ${page.relPath} has relative .md links; fix links before syncing`
    );
    return 1;
  }

  if (decision === "conflict") {
    printError(
      `sync: ${page.relPath} changed locally and on Confluence; pull or push explicitly`
    );
    return 1;
  }

  if (decision === "noop") {
    if (!options.quiet) {
      process.stdout.write(`In sync ${page.id}  ${page.title}\n`);
    }
    return 0;
  }

  if (decision === "pull") {
    const code = pullSingle(page.id, {
      cwd,
      quiet: options.quiet,
      filePath
    });
    if (code === 0 && !options.quiet) {
      process.stdout.write(`Pulled ${page.id} from Confluence\n`);
    }
    return code;
  }

  const code = await pushPage(page.id, cwd, {
    quiet: options.quiet,
    filePath
  });
  return code;
}

/** Run `confluence sync <path.md>`. */
export async function runSyncCommand(argv: string[]): Promise<number> {
  const input = argv[3];
  if (!input) {
    printError("sync: path to a .md file is required");
    return 1;
  }
  return runSync(input);
}
