import * as fs from "fs/promises";
import { generateKeybindingEnums } from "./generate-enums.ts";

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

async function loadCustomBindings(): Promise<Keybind[]> {
  const raw = await fs.readFile(new URL("./custom.json", import.meta.url));
  const parsed = JSON.parse(raw.toString()) as {
    bindings?: Keybind[];
  };
  if (!Array.isArray(parsed.bindings)) {
    throw new Error("custom.json must contain a bindings array");
  }
  return parsed.bindings;
}

/** Stable key order for custom.json: key, command, args, when (then platform overrides if present). */
function orderKeybind(b: Keybind): Keybind {
  const o: Keybind = { key: b.key };
  if (b.command !== undefined) o.command = b.command;
  if (b.args !== undefined) o.args = b.args;
  if (b.when !== undefined) o.when = b.when;
  if (b.mac !== undefined) o.mac = b.mac;
  if (b.linux !== undefined) o.linux = b.linux;
  if (b.win !== undefined) o.win = b.win;
  return o;
}

async function writeFormattedCustomJson(bindings: Keybind[]): Promise<void> {
  const doc = {
    $schema: "./keybindings.schema.json",
    bindings: bindings.map(orderKeybind),
  };
  await fs.writeFile(
    new URL("./custom.json", import.meta.url),
    `${JSON.stringify(doc, null, 2)}\n`,
  );
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
  positives: Keybind[],
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

async function buildMacosKeybinds(custom: Keybind[]): Promise<Keybind[]> {
  const rawNegatives = await loadJson(
    "defaultKeybinds/macos.negative.keybindings.json",
  );
  const linuxDefaults = await loadJson(
    "defaultKeybinds/linux.keybindings.json",
  );
  const { negatives, positives } = dedupeCancellingNegativePositivePairs(
    rawNegatives,
    linuxDefaults,
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

const custom = await loadCustomBindings();
// await writeFormattedCustomJson(custom);
await generateKeybindingEnums();

await writeKeybindingsFile(
  "../../home/Library/Application Support/Code/User/keybindings.json",
  await buildMacosKeybinds(custom),
);

await writeKeybindingsFile("../../home/.config/Code/User/keybindings.json", [
  osMarker("linux"),
  SEPARATOR,
  ...custom,
]);
