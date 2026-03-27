import * as fs from "fs/promises";
import custom from "./custom.ts";
import builtin from "./builtin.ts";

export type Keybind = {
  key: string;
  command: string;
  when?: string;
  args?: { [key: string]: any } | string;
};

type OS = "linux" | "macos";

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

function whenMatches(a?: string, b?: string): boolean {
  return (a ?? "") === (b ?? "");
}

function argsMatch(a?: Keybind["args"], b?: Keybind["args"]): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Drop pairs where a negative `-command` and a builtin `command` describe the same
 * chord (same key, when, args): they cancel and need not appear in the output.
 * Custom bindings are merged later and are never stripped here.
 *
 * On Linux, `linux.negative.keybindings.json` and `builtin.ts` are the same length
 * and align 1:1, so this removes both sections entirely (equivalent net effect:
 * fall through to VS Code defaults, plus `custom`).
 */
function dedupeCancellingNegativeBuiltinPairs(
  negatives: Keybind[],
  builtins: Keybind[]
): { negatives: Keybind[]; builtins: Keybind[] } {
  const builtinRemove = new Set<number>();
  const negativeRemove = new Set<number>();

  for (let i = 0; i < negatives.length; i++) {
    const n = negatives[i];
    if (!n.command.startsWith("-")) continue;

    const positiveCmd = n.command.slice(1);

    for (let j = 0; j < builtins.length; j++) {
      if (builtinRemove.has(j)) continue;

      const b = builtins[j];
      if (b.command !== positiveCmd) continue;
      if (b.key !== n.key) continue;
      if (!whenMatches(n.when, b.when)) continue;
      if (!argsMatch(n.args, b.args)) continue;

      negativeRemove.add(i);
      builtinRemove.add(j);
      break;
    }
  }

  return {
    negatives: negatives.filter((_, i) => !negativeRemove.has(i)),
    builtins: builtins.filter((_, j) => !builtinRemove.has(j)),
  };
}

async function Generate(outputFile: string, os: OS) {
  const rawNegatives =
    os === "macos" ? macosNegativeKeybindings : linuxNegativeKeybindings;

  const { negatives: negativesDeduped, builtins: builtinsDeduped } =
    dedupeCancellingNegativeBuiltinPairs(rawNegatives, [...builtin]);

  const seperator = {
    key: "-".repeat(200),
  } as Keybind;

  let keybinds: Keybind[] = [];

  keybinds.push({
    key: os,
  } as Keybind);
  keybinds.push(seperator);
  keybinds.push(...negativesDeduped);
  keybinds.push(seperator);
  keybinds.push(...builtinsDeduped);
  keybinds.push(seperator);
  keybinds.push(...custom);

  await fs.writeFile(outputFile, JSON.stringify(keybinds, null, 4));
}

await Generate(
  "../../../Library/Application Support/Code/User/keybindings.json",
  "macos"
);

await Generate("../../.config/Code/User/keybindings.json", "linux");
