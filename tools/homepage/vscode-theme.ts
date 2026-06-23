import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:vscode-theme.css";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

function settingsPath(): string {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
  );
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

  return `:root {\n  color-scheme: dark;\n${lines.join("\n")}\n}`;
}

/** Inject VS Code workbench colors as CSS custom properties. */
export function vscodeTheme(): Plugin {
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
    }
  };
}
