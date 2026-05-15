import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function repoDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

type CursorCliPermissionBlock = {
  allow?: string[];
  deny?: string[];
};

function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    if (seen.has(x)) {
      continue;
    }
    seen.add(x);
    out.push(x);
  }
  return out;
}

function mergePermissionBlocks(
  repo: CursorCliPermissionBlock,
  cli: CursorCliPermissionBlock,
): CursorCliPermissionBlock {
  const ra = repo.allow ?? [];
  const ca = cli.allow ?? [];
  const rd = repo.deny ?? [];
  const cd = cli.deny ?? [];
  return {
    allow: dedupePreserveOrder([...ra, ...ca]),
    deny: dedupePreserveOrder([...rd, ...cd]),
  };
}

export function mergeCursorCliPermissions(repo: string): void {
  const cursorDir = join(repo, "home/.cursor");
  mkdirSync(cursorDir, { recursive: true });
  const permFile = join(cursorDir, "permissions.json");
  const cliConfig = join(homedir(), ".cursor/cli-config.json");
  if (!existsSync(cliConfig)) {
    return;
  }
  let repoBlock: CursorCliPermissionBlock = {};
  if (existsSync(permFile)) {
    const raw = readFileSync(permFile, "utf8").trim();
    if (raw) {
      repoBlock = JSON.parse(raw) as CursorCliPermissionBlock;
    }
  }
  const cliRoot = JSON.parse(readFileSync(cliConfig, "utf8")) as {
    permissions?: CursorCliPermissionBlock;
  };
  const cliBlock = cliRoot.permissions ?? {};
  const merged = mergePermissionBlocks(repoBlock, cliBlock);
  const sorted = {
    allow: [...(merged.allow ?? [])].sort((a, b) => a.localeCompare(b)),
    deny: [...(merged.deny ?? [])].sort((a, b) => a.localeCompare(b)),
  };
  const text = `${JSON.stringify(sorted, null, 2)}\n`;
  writeFileSync(permFile, text, "utf8");
}
