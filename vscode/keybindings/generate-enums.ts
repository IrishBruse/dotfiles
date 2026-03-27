import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ENUM_TXT_DIR = path.join(DIR, "enums");

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/** One entry per line; empty lines and #-prefixed lines are ignored. */
async function readLineDelimitedFile(name: string): Promise<string[]> {
  const filePath = path.join(ENUM_TXT_DIR, name);
  let text: string;
  try {
    text = (await fs.readFile(filePath)).toString();
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw e;
  }
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t === "" || t.startsWith("#")) continue;
    out.push(t);
  }
  return out;
}

/** Build key/command/when suggestions from VS Code defaults, custom.json, and optional *.txt lists. */
export async function generateKeybindingEnums(): Promise<void> {
  const linux = JSON.parse(
    (await fs.readFile(path.join(DIR, "defaultKeybinds/linux.keybindings.json"))).toString()
  ) as { key?: string; command?: string; when?: string; mac?: string; linux?: string; win?: string }[];

  const macNeg = JSON.parse(
    (await fs.readFile(path.join(DIR, "defaultKeybinds/macos.negative.keybindings.json"))).toString()
  ) as { key?: string; command?: string; when?: string; mac?: string; linux?: string; win?: string }[];

  let customBindings: typeof linux = [];
  try {
    const customRaw = await fs.readFile(path.join(DIR, "custom.json"));
    const parsed = JSON.parse(customRaw.toString()) as { bindings?: typeof linux };
    customBindings = parsed.bindings ?? [];
  } catch {
    // custom.json missing during first setup
  }

  const keys = new Set<string>();
  const commands = new Set<string>();
  const whens = new Set<string>();

  const scan = (
    rows: { key?: string; command?: string; when?: string; mac?: string; linux?: string; win?: string }[]
  ) => {
    for (const r of rows) {
      if (r.key) keys.add(r.key);
      if (r.mac) keys.add(r.mac);
      if (r.linux) keys.add(r.linux);
      if (r.win) keys.add(r.win);
      if (r.command) commands.add(r.command);
      if (r.when) whens.add(r.when);
    }
  };

  scan(linux);
  scan(macNeg);
  scan(customBindings);

  for (const k of await readLineDelimitedFile("keys.txt")) keys.add(k);
  for (const c of await readLineDelimitedFile("commands.txt")) commands.add(c);
  for (const w of await readLineDelimitedFile("when.txt")) whens.add(w);

  const out = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://dotfiles.local/vscode-keybindings-enums.schema.json",
    definitions: {
      keyChord: {
        description:
          "Key chord. Suggestions: bundled defaults, enums/keys.txt, custom.json. Any chord string is allowed.",
        anyOf: [
          { enum: sortedUnique(keys) },
          { type: "string", description: "Any key chord (including values not in defaults)." },
        ],
      },
      commandId: {
        description:
          "Command ID. Suggestions: bundled defaults, custom.json, enums/commands.txt. Extension IDs: paste into commands.txt and run gen.",
        anyOf: [
          { enum: sortedUnique(commands) },
          { type: "string", description: "Any command ID." },
        ],
      },
      whenClause: {
        description:
          "When-clause. Suggestions: bundled defaults, enums/when.txt, custom.json.",
        anyOf: [
          { enum: sortedUnique(whens) },
          { type: "string", description: "Any when expression." },
        ],
      },
    },
  };

  await fs.writeFile(
    path.join(DIR, "keybindings.enums.json"),
    JSON.stringify(out, null, 4) + "\n"
  );
}
