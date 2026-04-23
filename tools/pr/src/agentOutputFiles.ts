import fs from "node:fs";
import path from "node:path";

/** Agent-written PR payload (review comment title line + markdown body, or PR title + description). */
export type PrReviewJson = {
  title: string;
  body: string;
  pr?: string;
};

/** Agent writes this file; first line `# Title`, blank line, then markdown body (same shape as the VS Code preview). */
export const MERGED_PREVIEW_FILE = "PR.md";

/** First line `# Title` (or `##`), blank line, then markdown body — same idea as git commit message files. */
export function buildPreviewMarkdown(title: string, body: string): string {
  const t = title.trim().replace(/\n/g, " ");
  return `# ${t}\n\n${body.replace(/^\n+/, "")}`;
}

/** Title = first markdown heading line (`# …`); everything after the first blank line following it = body. */
export function parsePreviewMarkdownFile(content: string): PrReviewJson {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === "") {
    i++;
  }
  if (i >= lines.length) {
    return { title: "", body: "" };
  }
  const first = lines[i]!.trim();
  let title: string;
  if (first.startsWith("#")) {
    title = first.replace(/^#+\s*/, "").trim();
    i++;
  } else {
    title = first;
    i++;
  }
  while (i < lines.length && lines[i]!.trim() === "") {
    i++;
  }
  const body = lines.slice(i).join("\n");
  return { title, body };
}

/**
 * Read **`PR.md`** from the agent workspace (required; non-empty title and body after parse).
 */
export function readAgentPrMarkdown(
  workspaceDir: string,
  cmdLabel: string,
): PrReviewJson {
  const prPath = path.join(workspaceDir, MERGED_PREVIEW_FILE);
  if (!fs.existsSync(prPath)) {
    throw new Error(
      `${cmdLabel}: missing ${MERGED_PREVIEW_FILE} in workspace — the agent must create this file in the workspace root`,
    );
  }
  const raw = fs.readFileSync(prPath, "utf8");
  const { title, body } = parsePreviewMarkdownFile(raw);
  if (title.trim() === "") {
    throw new Error(
      `${cmdLabel}: ${MERGED_PREVIEW_FILE} must start with a non-empty title (` +
        `\`# …\` heading or first line)`,
    );
  }
  if (body.trim() === "") {
    throw new Error(
      `${cmdLabel}: ${MERGED_PREVIEW_FILE} must have a non-empty body after the title`,
    );
  }
  return { title, body };
}
