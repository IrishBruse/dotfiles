import { writeFileSync } from "fs";
import * as path from "path";

process.chdir(import.meta.dirname);

const BASE =
  "https://raw.githubusercontent.com/codebling/vs-code-default-keybindings/refs/heads/master";

async function main() {
  await Promise.all([
    downloadKeybinding(`${BASE}/macos.negative.keybindings.json`),
    downloadKeybinding(`${BASE}/linux.keybindings.json`),
  ]);
}

async function downloadKeybinding(url: string) {
  const resp = await fetch(url);
  const text = (await resp.text()).split("\n").slice(2).join("\n").trim();
  const filename = path.basename(url);
  writeFileSync(`./defaultKeybinds/${filename}`, text);
}

main();
