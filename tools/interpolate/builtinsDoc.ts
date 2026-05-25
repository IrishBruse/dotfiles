import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const docPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "commands",
  "builtins.md"
);

export function loadBuiltinsDoc(): string {
  return fs.readFileSync(docPath, "utf8");
}
