import * as fs from "fs/promises";
import custom, { type Keybind } from "./custom.ts";

type OS = "linux" | "macos" | "windows";

async function loadJson(path: string) {
  const data = await fs.readFile(path);
  const text = data.toString();
  return JSON.parse(text);
}

const linuxNegativeKeybindings: Keybind[] = await loadJson(
  "defaultKeybinds/linux.negative.keybindings.json"
);

const macosNegativeKeybindings: Keybind[] = await loadJson(
  "defaultKeybinds/macos.negative.keybindings.json"
);

async function Generate(outputFile: string, os: OS) {
  let keybinds: Keybind[] = [];

  keybinds.push({
    key: os,
  } as any);

  if (os === "macos") {
    keybinds.push(...macosNegativeKeybindings);
  }

  if (os === "macos") {
    keybinds.push(...linuxNegativeKeybindings);
  }

  keybinds.push(...custom);

  await fs.writeFile(outputFile, JSON.stringify(keybinds, null, 4));
}

Generate(
  "../../Library/Application Support/Code/User/keybindings.json",
  "macos"
);

Generate("../../.config/Code/User/keybindings.json", "linux");
