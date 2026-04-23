import fs from "node:fs";
import path from "node:path";

/** Agent-written PR payload (review comment title line + markdown body, or PR title + description). */
export type PrReviewJson = {
  title: string;
  body: string;
  pr?: string;
};

export const AGENT_TITLE_FILE = "Title.md";
export const AGENT_BODY_FILE = "Body.md";

/** CLI merges {@link AGENT_TITLE_FILE} + {@link AGENT_BODY_FILE} into this for VS Code preview (`code --wait`). */
export const MERGED_PREVIEW_FILE = "PR.md";

/**
 * Read **`Title.md`** and **`Body.md`** from the agent workspace (required; non-empty).
 */
export function readAgentTitleAndBody(
  workspaceDir: string,
  cmdLabel: string,
): PrReviewJson {
  const titlePath = path.join(workspaceDir, AGENT_TITLE_FILE);
  const bodyPath = path.join(workspaceDir, AGENT_BODY_FILE);
  if (!fs.existsSync(titlePath)) {
    throw new Error(
      `${cmdLabel}: missing ${AGENT_TITLE_FILE} in workspace — the agent must create this file in the workspace root`,
    );
  }
  if (!fs.existsSync(bodyPath)) {
    throw new Error(
      `${cmdLabel}: missing ${AGENT_BODY_FILE} in workspace — the agent must create this file in the workspace root`,
    );
  }
  const title = fs.readFileSync(titlePath, "utf8").trim();
  const body = fs.readFileSync(bodyPath, "utf8");
  if (title === "") {
    throw new Error(`${cmdLabel}: ${AGENT_TITLE_FILE} is empty`);
  }
  if (body.trim() === "") {
    throw new Error(`${cmdLabel}: ${AGENT_BODY_FILE} is empty`);
  }
  return { title, body };
}
