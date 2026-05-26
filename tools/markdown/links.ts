import { linkFg, reset } from "./colors.ts";

/** Reference targets from `[id]: url` lines (GFM, case-insensitive keys). */
export type LinkRefs = Map<string, string>;

const refDefLine =
  /^\[([^\]]+)\]:\s+<?([^>\s]+)>?(?:\s+"[^"]*")?\s*$/;

export function isLinkRefDefLine(line: string): boolean {
  return refDefLine.test(line.trim());
}

export function collectLinkRefs(source: string): LinkRefs {
  const refs: LinkRefs = new Map();
  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    const m = refDefLine.exec(line.trim());
    if (m !== null) refs.set(m[1].toLowerCase(), m[2]);
  }
  return refs;
}

/** OSC 8 hyperlink: show `text`, target `url` on click. */
export function terminalLink(url: string, text: string, restoreFg: string): string {
  return `\x1b]8;;${url}\x07${linkFg}${text}${reset}${restoreFg}\x1b]8;;\x07`;
}
