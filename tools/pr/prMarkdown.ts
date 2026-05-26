export type PrMarkdown = {
  title: string;
  body: string;
};

/** Parse `# title` + body from agent stdout (strips trailing `done` line). */
export function parsePrMarkdownFromAgentOutput(content: string): PrMarkdown {
  let text = content.trim();
  const lines = text.split("\n");
  const last = lines.at(-1)?.trim() ?? "";
  if (last.toLowerCase() === "done") {
    text = lines.slice(0, -1).join("\n").trimEnd();
  }
  return parsePrMarkdown(text);
}

export function parsePrMarkdown(content: string): PrMarkdown {
  const lines = content.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (!first.startsWith("# ")) {
    throw new Error('agent output must start with # <title>');
  }
  const title = first.slice(2).trim();
  if (title === "") {
    throw new Error("PR title is empty");
  }
  let i = 1;
  while (i < lines.length && lines[i]?.trim() === "") {
    i += 1;
  }
  const body = lines.slice(i).join("\n").trim();
  if (body === "") {
    throw new Error("PR body is empty");
  }
  return { title, body };
}
