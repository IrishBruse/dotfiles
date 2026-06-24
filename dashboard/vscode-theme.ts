import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:vscode-theme.css";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

const MARKDOWN_INLINE_PREFIX = "markdownInlineEditor.colors.";

type TokenRule = {
  scope?: string | string[];
  settings?: { foreground?: string };
};

function settingsPath(): string {
  const candidates = [
    path.join(homedir(), ".config/Code/User/settings.json"),
    path.join(homedir(), "Library/Application Support/Code/User/settings.json")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("VS Code settings.json not found");
}

function parseJsonc(text: string): unknown {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(stripped);
}

function scopeMatches(scope: string | string[], needle: string): boolean {
  const scopes = Array.isArray(scope) ? scope : [scope];
  return scopes.some((entry) => entry.includes(needle));
}

function tokenForeground(rules: TokenRule[], needle: string): string | undefined {
  for (const rule of rules) {
    if (!rule.scope || !rule.settings?.foreground) {
      continue;
    }
    if (scopeMatches(rule.scope, needle)) {
      return rule.settings.foreground;
    }
  }
}

function markdownThemeLines(settings: Record<string, unknown>): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith(MARKDOWN_INLINE_PREFIX) && typeof value === "string") {
      const name = key.slice(MARKDOWN_INLINE_PREFIX.length);
      lines.push(`  --markdown-${name}: ${value};`);
    }
  }

  const codeSpanBorder = settings["markdown.extension.editor.codeSpan.border"];
  if (typeof codeSpanBorder === "string") {
    lines.push(`  --markdown-code-span-border: ${codeSpanBorder};`);
  }

  const tokenRules = (
    settings["editor.tokenColorCustomizations"] as
      | { textMateRules?: TokenRule[] }
      | undefined
  )?.textMateRules;

  if (tokenRules) {
    const mappings: [string, string][] = [
      ["beginning.punctuation.definition.list.markdown", "list-marker"],
      ["string.other.link.title.markdown", "link"],
      ["markup.quote.markdown", "blockquote"],
      ["markup.raw.block.markdown", "code-block-text"],
      ["markup.inline.raw.markdown", "inline-code-source"]
    ];

    for (const [needle, name] of mappings) {
      const color = tokenForeground(tokenRules, needle);
      if (color) {
        lines.push(`  --markdown-${name}: ${color};`);
      }
    }
  }

  return lines;
}

function vscodeThemeCss(): string {
  const settings = parseJsonc(readFileSync(settingsPath(), "utf8")) as Record<
    string,
    unknown
  >;
  const colors = settings["workbench.colorCustomizations"] as
    | Record<string, string>
    | undefined;

  const lines = Object.entries(colors ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, value]) => `  --vscode-${key.replace(/\./g, "-")}: ${value};`);

  for (const line of markdownThemeLines(settings)) {
    lines.push(line);
  }

  return `:root {\n  color-scheme: dark;\n${lines.join("\n")}\n}`;
}

/** Inject VS Code workbench and markdown colors as CSS custom properties. */
export function vscodeTheme(): Plugin {
  const settingsFile = settingsPath();

  return {
    name: "vscode-theme",
    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return vscodeThemeCss();
      }
    },
    configureServer(server) {
      server.watcher.add(settingsFile);
    },
    handleHotUpdate({ file, server }) {
      if (path.normalize(file) !== path.normalize(settingsFile)) {
        return;
      }
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) {
        server.reloadModule(mod);
      }
    }
  };
}
