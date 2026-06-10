import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { gitBranchForPath } from "./gitBranch.ts";
import { incidentFileName, incidentFilePath, LOGS_DIR } from "./paths.ts";
import { repoNameForPath } from "./repoName.ts";

export interface IncidentInput {
  cwd: string;
  title: string;
  detail: string;
  resolution?: string;
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function fileHeading(fileName: string, repo: string | null): string {
  const label = repo ?? "misc";
  const scope =
    repo === null
      ? "repos outside ~/git/"
      : `~/git/${repo}/`;
  return `# Incidents - ${label}

Agent incident log for ${scope}

`;
}

async function ensureFile(filePath: string, repo: string | null): Promise<void> {
  const fileName = path.basename(filePath);
  try {
    await appendFile(filePath, "", { flag: "wx" });
    await appendFile(filePath, fileHeading(fileName, repo), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }
}

function formatIncident(input: IncidentInput, at: Date): string {
  const repo = repoNameForPath(input.cwd);
  const branch = gitBranchForPath(input.cwd);
  const lines = [
    "",
    `## ${formatTimestamp(at)} - ${input.title}`,
    "",
    `- **cwd:** \`${input.cwd}\``,
    `- **repo:** ${repo ?? "misc"}`,
    `- **branch:** ${branch}`,
    ""
  ];

  if (input.detail.trim()) {
    lines.push(input.detail.trim(), "");
  }

  if (input.resolution?.trim()) {
    lines.push("**Resolution:**", "", input.resolution.trim(), "");
  }

  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Append one incident entry to the markdown log for `input.cwd`.
 *
 * @return absolute path of the log file written
 */
export async function logIncident(input: IncidentInput): Promise<string> {
  await mkdir(LOGS_DIR, { recursive: true });
  const filePath = incidentFilePath(input.cwd);
  const repo = repoNameForPath(input.cwd);
  await ensureFile(filePath, repo);
  await appendFile(filePath, formatIncident(input, new Date()), "utf8");
  return filePath;
}

export { incidentFileName, incidentFilePath, LOGS_DIR };
