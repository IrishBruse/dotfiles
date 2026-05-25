export function locationAt(
  text: string,
  index: number
): { line: number; column: number } {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  const column = lastNewline === -1 ? index + 1 : index - lastNewline;
  return { line, column };
}
