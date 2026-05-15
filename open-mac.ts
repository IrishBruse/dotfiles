import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { mergeCursorCliPermissions, repoDir } from "./open-shared.ts";
import { $, q } from "./shell.ts";

const repo = repoDir(import.meta.url);
const brewFish = join(repo, ".config/fish/conf.d/brew.fish");
mkdirSync(join(repo, ".config/fish/conf.d"), { recursive: true });

$(`brew bundle dump --no-vscode -f --file=./brewfile`);
$(`brew shellenv >${q(brewFish)}`);

mergeCursorCliPermissions(repo);
