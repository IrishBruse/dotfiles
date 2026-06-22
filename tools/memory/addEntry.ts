import process from "node:process";

import { readStdin } from "./args.ts";
import { appendEntry } from "./entries.ts";
import { printOk } from "./output.ts";
import { writeReference } from "./reference.ts";
import { resolveStore } from "./scope.ts";
import { parseSlug } from "./slug.ts";

/** Max inline sentence length; use `--detail` for longer reference content. */
export const MAX_ENTRY_LENGTH = 120;

function parseDetailFlag(args: string[]): {
  positional: string[];
  detail?: string;
} {
  const detailIndex = args.indexOf("--detail");
  if (detailIndex === -1) {
    return { positional: args };
  }

  const positional = args.slice(0, detailIndex);
  const afterDetail = args.slice(detailIndex + 1);
  if (afterDetail.length > 0) {
    return { positional, detail: afterDetail.join("\n\n").trim() };
  }

  return { positional, detail: undefined };
}

/**
 * Run `memory add <id> <sentence> [--detail [content...]]`.
 */
export async function runAdd(
  args: string[],
  options: { global: boolean }
): Promise<void> {
  const { positional, detail: detailFromArgs } = parseDetailFlag(args);
  const store = resolveStore(options.global, process.cwd());

  if (positional.length < 2) {
    throw new Error("Id and sentence are required.");
  }

  const [idRaw, ...sentenceParts] = positional;
  const id = parseSlug(idRaw!);
  const text = sentenceParts.join(" ").trim();

  if (!text) {
    throw new Error("Sentence is required.");
  }
  if (text.includes("\n")) {
    throw new Error("Sentence must be a single line.");
  }
  if (text.length > MAX_ENTRY_LENGTH) {
    throw new Error(
      `Sentence is too long (${text.length} characters, max ${MAX_ENTRY_LENGTH}). Keep one line in the entry and use --detail for reference content.`
    );
  }

  const hasDetailFlag = args.includes("--detail");
  let detail = detailFromArgs;
  if (hasDetailFlag && detail === undefined) {
    detail = await readStdin();
    if (!detail) {
      throw new Error("--detail requires content as arguments or on stdin.");
    }
  }

  const { added } = await appendEntry(store, {
    text,
    id,
    hasDetails: Boolean(detail),
  });

  if (!added) {
    throw new Error(`An entry with id "${id}" already exists.`);
  }

  if (detail) {
    await writeReference(store, id, detail);
  }

  printOk(detail ? "Added entry with reference detail." : "Added entry.");
}
