import { buildWorkJiraTitleSection } from "../create/work/jiraTitlePolicy.ts";
import { loadUpdateAgentPrompt } from "./updatePrompt.ts";

export function runUpdate(args: string[]): void {
  if (args.length > 0) {
    console.log("pr update: extra args (ignored for now):", args.join(" "));
  }

  const prompt = loadUpdateAgentPrompt({
    hintBlock: "",
    workJiraTitleSection: buildWorkJiraTitleSection(),
  });

  console.error(
    `pr update: stub — composed agent prompt (${prompt.length} chars); not invoking agent yet`,
  );
}
