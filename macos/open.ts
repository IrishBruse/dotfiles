/// <reference types="node" />

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { $, q } from "../shell.ts";
import { syncJiraSkill } from "../shared/jira-skill.ts";
import { syncBrew } from "./shared/brew.ts";
import { repoDir, repoRoot } from "./shared/repo.ts";

const JIRA_SYNC_LABEL = "com.econneely.jira-sync";

/** Reload jira-sync LaunchAgent so plist edits take effect without a manual bootout/bootstrap. */
function reloadJiraSyncLaunchAgent(): void {
  const plist = join(homedir(), "Library/LaunchAgents", `${JIRA_SYNC_LABEL}.plist`);
  if (!existsSync(plist)) return;

  const domain = `gui/${process.getuid()}`;
  $(`launchctl bootout ${q(`${domain}/${JIRA_SYNC_LABEL}`)} 2>/dev/null || true`);
  $(`launchctl bootstrap ${q(domain)} ${q(plist)}`);
}

const platform = repoDir(import.meta.url);
const repo = repoRoot(import.meta.url);

syncBrew(platform, repo);
syncJiraSkill(repo);
reloadJiraSyncLaunchAgent();
