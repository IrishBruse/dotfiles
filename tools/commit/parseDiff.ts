export interface StagedFile {
  status: "A" | "M" | "D" | "R" | "C";
  path: string;
  previousPath?: string;
}

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
  const byFile = new Map<string, string[]>();
  let currentFile: string | undefined;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = match?.[2];
      continue;
    }
    if (currentFile === undefined) {
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }
    const added = line.slice(1);
    const bucket = byFile.get(currentFile) ?? [];
    bucket.push(added);
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
