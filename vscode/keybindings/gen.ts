import * as fs from "fs/promises";
import custom from "./custom.ts";

export type Keybind = {
  key: string;
  command?: string;
  when?: string;
  args?: { [key: string]: any } | string;
  mac?: string;
  linux?: string;
  win?: string;
};

type OS = "linux" | "macos";

const SEPARATOR = {
  key: "-".repeat(200),
} as Keybind;

async function loadJson(path: string): Promise<Keybind[]> {
  const data = await fs.readFile(path);
  return JSON.parse(data.toString());
}

function whenMatches(a?: string, b?: string): boolean {
  return (a ?? "") === (b ?? "");
}

function argsMatch(a?: Keybind["args"], b?: Keybind["args"]): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Drop pairs where a negative `-command` and a positive default describe the same
 * chord (same key, when, args). Those entries cancel; omitting both restores VS Code
 * defaults for that chord.
 *
 * Used on macOS only: Linux negatives + linux defaults dedupe to nothing, so the Linux
 * build skips this path entirely and emits `custom` only.
 */
function dedupeCancellingNegativePositivePairs(
  negatives: Keybind[],
  positives: Keybind[]
): { negatives: Keybind[]; positives: Keybind[] } {
  const positiveRemove = new Set<number>();
  const negativeRemove = new Set<number>();

  for (let i = 0; i < negatives.length; i++) {
    const n = negatives[i];
    if (!n.command?.startsWith("-")) continue;

    const positiveCmd = n.command.slice(1);

    for (let j = 0; j < positives.length; j++) {
      if (positiveRemove.has(j)) continue;

      const p = positives[j];
      if (p.command !== positiveCmd) continue;
      if (p.key !== n.key) continue;
      if (!whenMatches(n.when, p.when)) continue;
      if (!argsMatch(n.args, p.args)) continue;

      negativeRemove.add(i);
      positiveRemove.add(j);
      break;
    }
  }

  return {
    negatives: negatives.filter((_, i) => !negativeRemove.has(i)),
    positives: positives.filter((_, j) => !positiveRemove.has(j)),
  };
}

function osMarker(os: OS): Keybind {
  return { key: os } as Keybind;
}

async function writeKeybindingsFile(outputFile: string, entries: Keybind[]) {
  await fs.writeFile(outputFile, JSON.stringify(entries, null, 4));
}

async function buildMacosKeybinds(): Promise<Keybind[]> {
  const rawNegatives = await loadJson(
    "defaultKeybinds/macos.negative.keybindings.json"
  );
  const linuxDefaults = await loadJson("defaultKeybinds/linux.keybindings.json");
  const { negatives, positives } = dedupeCancellingNegativePositivePairs(
    rawNegatives,
    linuxDefaults
  );
  return [
    osMarker("macos"),
    SEPARATOR,
    ...negatives,
    SEPARATOR,
    ...positives,
    SEPARATOR,
    ...custom,
  ];
}

await writeKeybindingsFile(
  "../../../Library/Application Support/Code/User/keybindings.json",
  await buildMacosKeybinds()
);

await writeKeybindingsFile("../../.config/Code/User/keybindings.json", [
  osMarker("linux"),
  SEPARATOR,
  ...custom,
]);
