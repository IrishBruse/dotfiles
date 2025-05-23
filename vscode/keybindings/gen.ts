import * as fs from "fs/promises";
import custom from "./custom.ts";
import builtin from "./builtin.ts";

export type Keybind = {
  key: string;
  command: string;
  when?: string;
  args?: { [key: string]: any } | string;
};

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
  let osSpecific: Keybind[] = linuxNegativeKeybindings
    .filter((keybind) => keybind.command.startsWith("-"))
    .map((k) => {
      return {
        ...k,
        command: k.command.slice(1),
      };
    });

  osSpecific.sort((a, b) => a.command.localeCompare(b.command));

  const seperator = {
    key: "-".repeat(200),
  } as Keybind;

  let keybinds: Keybind[] = [];

  keybinds.push({
    key: os,
  } as Keybind);

  keybinds.push(seperator);
  keybinds.push(
    ...(os === "macos" ? macosNegativeKeybindings : linuxNegativeKeybindings)
  );

  keybinds.push(seperator);
  keybinds.push(...builtin);
  keybinds.push(seperator);
  keybinds.push(...custom);

  await fs.writeFile(outputFile, JSON.stringify(keybinds, null, 4));
}

Generate(
  "../../../Library/Application Support/Code - Insiders/User/keybindings.json",
  "macos"
);

// Generate("../../.config/Code/User/keybindings.json", "linux");
