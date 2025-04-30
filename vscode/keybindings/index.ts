import * as fs from "fs/promises";
import custom, { type Keybind } from "./custom.ts";

type OS = "linux" | "macos" | "windows";

const os: OS = process.platform === "darwin" ? "macos" : "linux";

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

async function Generate(outputFile: string) {
  let keybinds: Keybind[] = [];

  // Remove macos if being readded by linux
  for (const bind of macosNegativeKeybindings) {
    const found =
      linuxNegativeKeybindings.find((other) => {
        return (
          other.command === bind.command &&
          other.when === bind.when &&
          other.key === bind.key
        );
      }) !== undefined;

    if (!found) {
      keybinds.push(bind);
    }
  }

  // Remove linux if being readded by linux
  for (const bind of linuxNegativeKeybindings) {
    const found =
      macosNegativeKeybindings.find((other) => {
        return (
          other.command === bind.command &&
          other.when === bind.when &&
          other.key === bind.key
        );
      }) !== undefined;

    if (!found) {
      const newBinding = {
        key: bind.key,
        command: bind.command,
        when: bind.when,
        args: bind.args,
      };

      if (newBinding.command[0] !== "-") {
        throw new Error("missing -");
      }
      newBinding.command = newBinding.command.slice(1);
      keybinds.push(newBinding);
    }
  }

  keybinds.sort((a, b) => a.command.localeCompare(b.command));

  keybinds.push({
    "1": "",
    "2": "",
    "3": "--------------------------- CUSTOM ---------------------------",
    "4": "",
    "5": "",
  } as any);

  keybinds.push(...custom);

  await fs.writeFile(outputFile, JSON.stringify(keybinds, null, 4));
}

if (os == "macos") {
  Generate(
    "/Users/econneely/Library/Application Support/Code/User/keybindings.json"
  );
} else {
  Generate("/home/econn/.config/Code/User/keybindings.json");
}
