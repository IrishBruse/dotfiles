/** Strip optional markdown fences and trailing agent filler from stdout. */
export function parseCommitMessage(content: string): string {
  let text = content.trim();
  const fence = text.match(/^```(?:\w+)?\n([\s\S]*?)\n```$/);
  if (fence) {
    text = fence[1]!.trim();
  }

  const lines = text.split("\n");
  const last = lines.at(-1)?.trim() ?? "";
  if (last.toLowerCase() === "done") {
    text = lines.slice(0, -1).join("\n").trimEnd();
  }

  if (text === "") {
    throw new Error("agent output is empty");
  }
  return text;
}
