/// <reference types="node" />

import { syncJiraSkill } from "../shared/jira-skill.ts";
import { syncBrew } from "./shared/brew.ts";
import { repoDir, repoRoot } from "./shared/repo.ts";

const platform = repoDir(import.meta.url);
const repo = repoRoot(import.meta.url);

syncBrew(platform, repo);
syncJiraSkill(repo);
