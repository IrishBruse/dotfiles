import type { StagedFile } from "../types.ts";

export function parseNameStatus(text: string): StagedFile[] {
  const files: StagedFile[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    const parts = trimmed.split(/\t+/);
    const status = parts[0]!;
    if (status.startsWith("R") || status.startsWith("C")) {
      const path = parts[2];
      const previousPath = parts[1];
      if (path === undefined || previousPath === undefined) {
        continue;
      }
      files.push({
        status: status[0] as StagedFile["status"],
        path,
        previousPath
      });
      continue;
    }
    const path = parts[1];
    if (path === undefined) {
      continue;
    }
    files.push({
      status: status as StagedFile["status"],
      path
    });
  }
  return files;
}

export function parseAddedLinesByFile(diff: string): Map<string, string[]> {
  return parseDiffLinesByFile(diff, "+");
}

export function parseRemovedLinesByFile(diff: string): Map<string, string[]> {
  return parseDiffLinesByFile(diff, "-");
}

function parseDiffLinesByFile(
  diff: string,
  prefix: "+" | "-"
): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  let currentFile: string | undefined;
  const header = prefix === "+" ? "+++" : "---";
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = match?.[2];
      continue;
    }
    if (currentFile === undefined) {
      continue;
    }
    if (!line.startsWith(prefix) || line.startsWith(header)) {
      continue;
    }
    const content = line.slice(1);
    const bucket = byFile.get(currentFile) ?? [];
    bucket.push(content);
    byFile.set(currentFile, bucket);
  }
  return byFile;
}

export function countDiffLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removed += 1;
    }
  }
  return { added, removed };
}

export function filterNameStatus(nameStatus: string, paths: Set<string>): string {
  const lines: string[] = [];
  for (const line of nameStatus.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    const parts = trimmed.split(/\t+/);
    const status = parts[0]!;
    if (status.startsWith("R") || status.startsWith("C")) {
      const previousPath = parts[1];
      const path = parts[2];
      if (
        path !== undefined &&
        (paths.has(path) || (previousPath !== undefined && paths.has(previousPath)))
      ) {
        lines.push(line);
      }
      continue;
    }
    const path = parts[1];
    if (path !== undefined && paths.has(path)) {
      lines.push(line);
    }
  }
  return lines.join("\n");
}

export function filterDiff(diff: string, paths: Set<string>): string {
  if (diff === "") {
    return "";
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let currentPath: string | undefined;

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      if (current.length > 0 && currentPath !== undefined && paths.has(currentPath)) {
        chunks.push(current.join("\n"));
      }
      current = [line];
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentPath = match?.[2];
      continue;
    }
    current.push(line);
  }

  if (current.length > 0 && currentPath !== undefined && paths.has(currentPath)) {
    chunks.push(current.join("\n"));
  }

  return chunks.join("\n");
}
