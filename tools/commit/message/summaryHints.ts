const LOW_VALUE_SYMBOL =
  /^(?:get|has|is|set|parse|load|run|print|create|resolve|expand|find|match|analyze|confidence|empty|pick|infer|strip|sanitize|clamp|humanize|paths|execute|misc|path|count|git|build|interactive|memory|rules|dotfiles|entry|entries)$/i;

const LOW_VALUE_TYPE_SUFFIX =
  /(?:Analysis|Config|Options|Result|Vars|Hints?|Slice|Match|Rule)$/i;

const OPTION_LINE =
  /^\s*(-[\w-]+(?:,\s*--[\w-]+)?|--[\w-]+)\s+\S/;

const INLINE_FLAG = /(?:^|[\s(,])(-[\w-]+|--[\w-]+)(?=[\s,.)]|$)/g;

const BOILERPLATE_FLAGS = new Set(["-h", "--help", "-?", "--version", "-v"]);

export function extractCliFlags(addedLines: string[]): string[] {
  const flags = new Set<string>();
  for (const line of addedLines) {
    const option = line.match(OPTION_LINE);
    if (option) {
      for (const part of option[1]!.split(/,\s*/)) {
        if (!BOILERPLATE_FLAGS.has(part)) {
          flags.add(part);
        }
      }
      continue;
    }
    if (!mentionsCliFlags(line)) {
      continue;
    }
    for (const match of line.matchAll(INLINE_FLAG)) {
      const flag = match[1];
      if (flag !== undefined && flag.length > 1 && !BOILERPLATE_FLAGS.has(flag)) {
        flags.add(flag);
      }
    }
  }
  return orderCliFlags([...flags]);
}

export function rankSummarySymbols(symbols: string[]): string[] {
  const scored = new Map<string, number>();
  for (const symbol of symbols) {
    const score = scoreSymbol(symbol);
    if (score <= 0) {
      continue;
    }
    const prev = scored.get(symbol) ?? 0;
    if (score > prev) {
      scored.set(symbol, score);
    }
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([symbol]) => symbol);
}

export function humanizeSymbol(name: string): string {
  const stripped = stripVerbPrefix(name);
  return stripped
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

export function formatCliFlagSummary(flags: string[], type: "fix" | "feature"): string {
  const verb = type === "fix" ? "fix" : "add";
  const ordered = orderCliFlags(flags);
  if (ordered.length === 0) {
    return "";
  }
  const shorts = ordered.filter((f) => f.startsWith("-") && !f.startsWith("--"));
  const longs = ordered.filter((f) => f.startsWith("--"));
  const parts: string[] = [];
  if (shorts.length > 0) {
    parts.push(shorts.slice(0, 2).join(" and "));
  }
  if (longs.length > 0) {
    parts.push(longs.slice(0, 2).join(" and "));
  }
  const phrase = parts.join(" and ");
  const noun = ordered.length === 1 ? "flag" : "flags";
  return `${verb} ${phrase} ${noun}`;
}

export function deduplicateHumanizedSymbols(symbols: string[]): string[] {
  const unique = [...new Set(symbols)];
  const drop = new Set<string>();
  for (const shorter of unique) {
    for (const longer of unique) {
      if (shorter !== longer && longer.startsWith(`${shorter} `)) {
        drop.add(shorter);
      }
    }
  }
  return unique.filter((s) => !drop.has(s));
}

export function formatSymbolSummary(
  symbols: string[],
  type: "fix" | "feature",
  scope: string
): string {
  const humanized = deduplicateHumanizedSymbols(symbols.map(humanizeSymbol)).filter(
    (s) => s.length > 0
  );
  const filtered = humanized.filter((s) => !isScopeEchoSymbol(s, scope));
  if (filtered.length === 0 || isLowQualitySymbolSummary(filtered)) {
    return "";
  }
  const lead = type === "fix" ? "fix" : "add";
  return `${lead} ${filtered[0]!}`;
}

export function isLowQualitySymbolSummary(symbols: string[]): boolean {
  if (symbols.length === 0) {
    return true;
  }
  const humanized = symbols.slice(0, 2).map(humanizeSymbol);
  const joined = humanized.join(" and ");
  if (joined.length > 48) {
    return true;
  }
  if (/\b(get|has|is) \w+ (and )?(get|has|is)\b/.test(joined)) {
    return true;
  }
  if (humanized.every((s) => LOW_VALUE_SYMBOL.test(s.replace(/\s+/g, "")))) {
    return true;
  }
  return false;
}

function scoreSymbol(name: string): number {
  let score = 10;
  if (LOW_VALUE_SYMBOL.test(name)) {
    score -= 12;
  }
  if (LOW_VALUE_TYPE_SUFFIX.test(name)) {
    score -= 6;
  }
  if (name.length > 28) {
    score -= 3;
  }
  if (/^[A-Z]/.test(name) && /[a-z]/.test(name) && !name.includes("_")) {
    score -= 2;
  }
  return score;
}

function stripVerbPrefix(name: string): string {
  const match = name.match(
    /^(?:get|has|is|set|push|pull|send|run|load|parse|create|resolve|expand|find|match)([A-Z].*)$/
  );
  if (!match) {
    return name;
  }
  const rest = match[1]!;
  return rest.length >= 3 ? rest : name;
}

function mentionsCliFlags(line: string): boolean {
  return (
    /\bflags?\b/i.test(line) ||
    /\bOptions:\b/.test(line) ||
    /\bUse\s+-\w/.test(line)
  );
}

function orderCliFlags(flags: string[]): string[] {
  const shorts = flags.filter((f) => f.startsWith("-") && !f.startsWith("--")).sort();
  const longs = flags.filter((f) => f.startsWith("--")).sort();
  return [...shorts, ...longs];
}

function isScopeEchoSymbol(symbol: string, scope: string): boolean {
  if (symbol === scope) {
    return true;
  }
  if (symbol.replace(/\s+/g, "-") === scope) {
    return true;
  }
  return false;
}
