/// <reference types="node" />

import { cursorAgentConfig } from "../shared/agent-config.ts";
import { exportAptMd } from "./shared/apt.ts";
import { syncDconf } from "./shared/dconf.ts";
import { repoDir, repoRoot } from "../shared/repo.ts";

const platform = repoDir(import.meta.url);
const repo = repoRoot(import.meta.url);

syncDconf(repo);
exportAptMd(platform);
cursorAgentConfig(repo);
