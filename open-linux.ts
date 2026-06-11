/// <reference types="node" />

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportAgentConfig, repoDir } from "./open-shared.ts";
import { $, q } from "./shell.ts";

const repo = repoDir(import.meta.url);
const dconfOut = join(repo, "home/.config/dconf/user.ini");
mkdirSync(join(repo, "home/.config/dconf"), { recursive: true });

$(`dconf dump / >${q(dconfOut)}`);

const dumped = readFileSync(dconfOut, "utf8");
const filtered = dumped
  .split("\n")
  .filter(
    (line) =>
      !line.startsWith("install-last-run=") &&
      !line.startsWith("refresh-last-run=")
  )
  .join("\n");
writeFileSync(dconfOut, filtered);

exportAgentConfig(repo);
