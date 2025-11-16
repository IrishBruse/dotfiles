const allowedLanguages = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "css",
  "html",
  "json",
  "python",
  "java",
  "cs",
  "cpp",
  "go",
  "ruby",
  "php",
  "rust",
  "swift",
  "kotlin",
  "dart",
  "vue",
  "svelte",
  "markdown",
  "yaml",
  "xml",
  "shell",
  "elixir",
  "erlang",
  "haskell",
  "lua",
  "perl",
  "r",
  "scala",
  "sql",
  "latex",
  "dockerfile",
  "graphql",
  "ini",
  "less",
  "scss",
  "shaderlab",
  "stylus",
  "toml",
  "vb",
  "hurl",
  "xml",
  "xsl",
  "zig",
];

import { readFileSync } from "fs";
import { jsonc as JSONC } from "jsonc";
import { homedir } from "os";
import { resolve } from "path";

const text = readFileSync(
  resolve(homedir(), ".config/Code/User/settings.json")
);
const settings = JSONC.parse(text.toString());
const textMateRules =
  settings["editor.tokenColorCustomizations"]["textMateRules"];

const colors: Record<string, Record<string, string[]>> = {};

for (const obj of textMateRules) {
  const scopes = !Array.isArray(obj.scope) ? [obj.scope] : obj.scope;
  const foregroundColor = obj.settings.foreground;

  for (const scope of scopes) {
    let language = "unknown"; // Default language

    const sourceMatch = scope.match(/source\.([a-zA-Z0-9]+)/);
    if (
      sourceMatch &&
      sourceMatch[1] &&
      allowedLanguages.includes(sourceMatch[1])
    ) {
      language = sourceMatch[1];
    } else {
      // Try to extract language from ".lang" at the end
      const dotLangMatch = scope.match(/\.([a-zA-Z0-9]+)$/);
      if (
        dotLangMatch &&
        dotLangMatch[1] &&
        allowedLanguages.includes(dotLangMatch[1])
      ) {
        language = dotLangMatch[1];
      }
    }

    if (!colors[language]) {
      colors[language] = {};
    }

    if (!colors[language][foregroundColor]) {
      colors[language][foregroundColor] = [];
    }
    colors[language][foregroundColor].push(scope);
  }
}

const newRules: any[] = [];

for (const [lang, value] of Object.entries(colors)) {
  // console.log(color);

  for (const [color, scope] of Object.entries(value)) {
    // console.log(lang);
    // console.log(scope);

    newRules.push({
      scope: scope,
      settings: {
        foreground: color,
      },
    });
  }
}

console.log(JSON.stringify(newRules, null, 2));
