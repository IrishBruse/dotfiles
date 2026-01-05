import { writeFileSync } from "fs";
import * as path from "path";

process.chdir(import.meta.dirname);

async function main() {
  Promise.all([
    downloadKeybinding(
      "https://raw.githubusercontent.com/codebling/vs-code-default-keybindings/refs/heads/master/macos.negative.keybindings.json"
    ),
    downloadKeybinding(
      "https://raw.githubusercontent.com/codebling/vs-code-default-keybindings/refs/heads/master/linux.negative.keybindings.json"
    ),
    downloadKeybinding(
      "https://raw.githubusercontent.com/codebling/vs-code-default-keybindings/refs/heads/master/linux.keybindings.json"
    ),
  ]);
}

async function downloadKeybinding(url: string) {
  const resp = await fetch(url);
  const text = (await resp.text()).split("\n").slice(2).join("\n").trim();

  const p = path.basename(url);

  writeFileSync("./defaultKeybinds/" + p, text);
}

main();
