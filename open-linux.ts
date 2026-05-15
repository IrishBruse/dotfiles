import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { mergeCursorCliPermissions, repoDir } from "./open-shared.ts";
import { $, q } from "./shell.ts";

const repo = repoDir(import.meta.url);
const dconfOut = join(repo, "home/.config/dconf/user.ini");
mkdirSync(join(repo, "home/.config/dconf"), { recursive: true });

$(`dconf dump / >${q(dconfOut)}`);

mergeCursorCliPermissions(repo);
