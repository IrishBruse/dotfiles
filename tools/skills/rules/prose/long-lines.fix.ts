import { MAX_LINE } from "../core/shared.ts";
import { mapDocumentLines } from "../core/fix-shared.ts";

type LineToken =
  | { kind: "prose"; text: string }
  | { kind: "code"; text: string };

/** Plain prose or list body text worth auto-wrapping. */
export function isWrappableLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (trimmed === "") return false;
  if (/^#{1,6}\s/.test(trimmed)) return false;
  if (/^>\s?/.test(trimmed)) return false;
  if (/^\|/.test(trimmed)) return false;
  if (/^```/.test(trimmed)) return false;
  if (/^<[/!?a-zA-Z]/.test(trimmed)) return false;
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return false;
  return true;
}

/** @deprecated Use isWrappableLine. */
export function isSimpleProseLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (!isWrappableLine(line)) return false;
  if (/^[-*+]\s/.test(trimmed)) return false;
  if (/^\d+\.\s/.test(trimmed)) return false;
  return true;
}

function tokenizeInlineCode(line: string): LineToken[] {
  const tokens: LineToken[] = [];
  const pattern = /(`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "prose", text: line.slice(lastIndex, match.index) });
    }
    tokens.push({ kind: "code", text: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    tokens.push({ kind: "prose", text: line.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ kind: "prose", text: line }];
}

function splitProseAtSpace(prose: string, maxLength: number): [string, string] | null {
  if (prose.length <= maxLength) return [prose, ""];
  const window = prose.slice(0, maxLength + 1);
  const spaceAt = window.lastIndexOf(" ");
  if (spaceAt <= 0) return null;
  return [prose.slice(0, spaceAt), prose.slice(spaceAt + 1)];
}

function wrapTokens(
  tokens: LineToken[],
  options?: { firstLinePrefix?: string }
): string[] {
  const prefix = options?.firstLinePrefix ?? "";
  const lines: string[] = [prefix];

  function currentLine(): string {
    return lines[lines.length - 1] ?? "";
  }

  function setCurrentLine(value: string): void {
    lines[lines.length - 1] = value;
  }

  function startNewLine(): void {
    lines.push("");
  }

  function remainingRoom(): number {
    return MAX_LINE - currentLine().length;
  }

  for (const token of tokens) {
    if (token.kind === "code") {
      if (currentLine().length > 0 && currentLine().length + token.text.length > MAX_LINE) {
        startNewLine();
      }
      setCurrentLine(currentLine() + token.text);
      continue;
    }

    let prose = token.text;
    while (prose.length > 0) {
      const room = remainingRoom();
      if (prose.length <= room) {
        setCurrentLine(currentLine() + prose);
        prose = "";
        continue;
      }

      if (room <= 0) {
        startNewLine();
        continue;
      }

      const split = splitProseAtSpace(prose, room);
      if (!split) {
        if (currentLine().length > prefix.length) {
          startNewLine();
          continue;
        }
        setCurrentLine(currentLine() + prose);
        prose = "";
        break;
      }

      const [head, tail] = split;
      if (head.trim() === "" || tail.trim() === "") {
        if (currentLine().length > prefix.length) {
          startNewLine();
          continue;
        }
        setCurrentLine(currentLine() + prose);
        prose = "";
        break;
      }

      setCurrentLine(currentLine() + head);
      prose = tail;
      startNewLine();
    }
  }

  return lines;
}

export function wrapLinePreservingInlineCode(
  line: string,
  options?: { firstLinePrefix?: string }
): string {
  const prefix = options?.firstLinePrefix ?? "";
  if (prefix.length + line.length <= MAX_LINE) {
    return prefix + line;
  }

  const wrapped = wrapTokens(tokenizeInlineCode(line), {
    firstLinePrefix: prefix,
  }).join("\n");
  return wrapped.includes("\n") ? wrapped : prefix + line;
}

/** @deprecated Use wrapLinePreservingInlineCode. */
export function wrapProse(line: string): string {
  return wrapLinePreservingInlineCode(line);
}

function parseListPrefix(line: string): { prefix: string; body: string } | null {
  const unordered = /^(\s*[-*+]\s)(.*)$/.exec(line);
  if (unordered) {
    return { prefix: unordered[1], body: unordered[2] ?? "" };
  }

  const ordered = /^(\s*\d+\.\s)(.*)$/.exec(line);
  if (ordered) {
    return { prefix: ordered[1], body: ordered[2] ?? "" };
  }

  return null;
}

function wrapLine(line: string): string {
  const list = parseListPrefix(line);
  if (!list) {
    return wrapLinePreservingInlineCode(line);
  }

  if (list.prefix.length + list.body.length <= MAX_LINE) {
    return line;
  }

  return wrapLinePreservingInlineCode(list.body, {
    firstLinePrefix: list.prefix,
  });
}

export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    if (
      rawLine.length <= MAX_LINE ||
      rawLine.includes("://") ||
      /^\s*\|/.test(rawLine) ||
      !isWrappableLine(rawLine)
    ) {
      return rawLine;
    }
    return wrapLine(rawLine);
  });
}
