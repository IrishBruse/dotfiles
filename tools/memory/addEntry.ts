import { printOk } from "./output.ts";
import { appendEntry } from "./entries.ts";
import { writeSkill } from "./renderSkill.ts";
import { parseSlug } from "./slug.ts";

/** Max inline sentence length; use `memory show` for longer detail. */
export const MAX_ENTRY_LENGTH = 120;

/**
 * Run `memory add <id> <sentence>`.
 */
export async function runAdd(args: string[]): Promise<void> {
  if (args.length < 2) {
    throw new Error("Id and sentence are required.");
  }

  const [idRaw, ...sentenceParts] = args;
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
      `Sentence is too long (${text.length} characters, max ${MAX_ENTRY_LENGTH}). Keep one line in the skill and use memory show for detail.`
    );
  }

  const { entries, added } = await appendEntry({ text, id, hasDetails: false });
  await writeSkill(entries);

  if (!added) {
    throw new Error(`An entry with id "${id}" already exists.`);
  }

  printOk("Added entry.");
}
