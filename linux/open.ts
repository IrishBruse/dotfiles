/// <reference types="node" />

import { syncJiraSkill } from "../shared/jira-skill.ts";
import { exportAptCsv } from "./shared/apt.ts";
import { syncDconf } from "./shared/dconf.ts";
import { repoDir, repoRoot } from "./shared/repo.ts";

const platform = repoDir(import.meta.url);
const repo = repoRoot(import.meta.url);

syncDconf(repo);
exportAptCsv(platform);
syncJiraSkill(repo);
