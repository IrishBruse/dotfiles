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
  // if (os === "macos") {
  //   keybinds.push(...macosNegativeKeybindings);
  // }

  // if (os === "linux") {
  //   keybinds.push(...linuxNegativeKeybindings);
  // }

  let macosUnique: Keybind[] = [];

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
      macosUnique.push(bind);
    }
  }

  let linuxUnique: Keybind[] = [];

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
      linuxUnique.push(newBinding);
    }
  }

  macosUnique.sort((a, b) => a.command.localeCompare(b.command));
  linuxUnique.sort((a, b) => a.command.localeCompare(b.command));

  const seperator = {
    key: "-".repeat(200),
  } as Keybind;

  let keybinds: Keybind[] = [
    {
      key: os,
    } as Keybind,
    seperator,
    ...macosUnique,
    seperator,
    ...linuxUnique,
    seperator,
    ...custom,
  ];

  await fs.writeFile(outputFile, JSON.stringify(keybinds, null, 4));
}

Generate(
  "../../Library/Application Support/Code/User/keybindings.json",
  "macos"
);

Generate("../../.config/Code/User/keybindings.json", "linux");
