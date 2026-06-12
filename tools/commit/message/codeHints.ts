import ts from "typescript";

export interface CodeHints {
  newSymbols: string[];
  fixSignals: number;
  featureSignals: number;
}

const CS_NEW_SYMBOL =
  /^\+\s*(?:public|internal|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?:class|interface|record|struct|enum)\s+([A-Za-z_][\w]*)/gm;

const CS_NEW_METHOD =
  /^\+\s*(?:public|internal|protected)\s+(?:static\s+)?(?:async\s+)?(?:virtual\s+)?(?:override\s+)?[\w<>,\[\]?]+\s+([A-Za-z_][\w]*)\s*\(/gm;

const FIX_COMMENT =
  /\b(?:fix(?:ed|es|ing)?|bug|regression|null check|guard clause|prevent crash|handle missing)\b/i;

export function hintsFromAddedLines(
  filePath: string,
  addedLines: string[]
): CodeHints {
  if (/\.(?:tsx?|mts|cts)$/i.test(filePath)) {
    return hintsFromTypeScript(addedLines);
  }
  if (/\.cs$/i.test(filePath)) {
    return hintsFromCSharp(addedLines);
  }
  return { newSymbols: [], fixSignals: 0, featureSignals: 0 };
}

function hintsFromTypeScript(addedLines: string[]): CodeHints {
  const snippet = addedLines.join("\n");
  const newSymbols: string[] = [];
  let fixSignals = 0;
  let featureSignals = 0;

  for (const line of addedLines) {
    fixSignals += fixSignalsInLine(line);
  }

  let sourceFile: ts.SourceFile;
  try {
    sourceFile = ts.createSourceFile(
      "snippet.ts",
      snippet,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
  } catch {
    return { newSymbols, fixSignals, featureSignals };
  }

  const visit = (node: ts.Node): void => {
    if (ts.canHaveModifiers(node)) {
      const mods = ts.getModifiers(node);
      const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (exported && ts.isFunctionDeclaration(node) && node.name) {
        newSymbols.push(node.name.text);
        featureSignals += 2;
      }
      if (exported && (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node))) {
        const name = node.name?.text;
        if (name) {
          newSymbols.push(name);
          featureSignals += 2;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { newSymbols, fixSignals, featureSignals };
}

function hintsFromCSharp(addedLines: string[]): CodeHints {
  const newSymbols: string[] = [];
  const seen = new Set<string>();
  let fixSignals = 0;
  let featureSignals = 0;

  const prefixed = addedLines.map((line) => `+ ${line}`).join("\n");

  for (const line of addedLines) {
    fixSignals += fixSignalsInLine(line);
  }

  for (const re of [CS_NEW_SYMBOL, CS_NEW_METHOD]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(prefixed)) !== null) {
      const name = match[1];
      if (name && !seen.has(name)) {
        seen.add(name);
        newSymbols.push(name);
        featureSignals += 2;
      }
    }
  }

  return { newSymbols, fixSignals, featureSignals };
}

function fixSignalsInLine(line: string): number {
  const trimmed = line.trim();
  if (trimmed === "") {
    return 0;
  }
  if (/^\/\//.test(trimmed) || /^\*/.test(trimmed) || /^\/\*/.test(trimmed)) {
    return FIX_COMMENT.test(trimmed) ? 1 : 0;
  }
  const literal = trimmed.match(/["'`]([^"'`]{8,})["'`]/);
  if (literal && FIX_COMMENT.test(literal[1]!)) {
    return 1;
  }
  return 0;
}
