import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { $, q } from "../../shell.ts";

export function syncBrew(platformDir: string, repo: string): void {
  const brewfile = join(platformDir, "Brewfile");
  const fishConf = join(repo, "home/.config/fish/conf.d");
  mkdirSync(fishConf, { recursive: true });

  $(`brew bundle dump --no-vscode -f --file=${q(brewfile)}`);
  $(`brew shellenv fish >${q(join(fishConf, "brew.fish"))}`);
}
