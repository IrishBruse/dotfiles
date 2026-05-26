import process from "node:process";

import { builtinVars } from "./builtins/index.ts";
import { envNamePattern } from "./builtins/env.ts";
import type { InterpolationError } from "./api.ts";
import { locationAt } from "./location.ts";

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;
const ENV_PREFIX = "env:";

export function findUndefinedVariables(
  template: string,
  cliVars: Record<string, string>
): InterpolationError[] {
  const merged = { ...builtinVars(), ...cliVars };
  const errors: InterpolationError[] = [];

  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    const inner = match[1];
    const index = match.index;
    if (inner === undefined || index === undefined) {
      continue;
    }

    const { line, column } = locationAt(template, index);

    if (inner.startsWith(ENV_PREFIX)) {
      const envName = inner.slice(ENV_PREFIX.length);
      if (!envNamePattern.test(envName)) {
        errors.push({ line, column, message: `undefined variable "${inner}"` });
        continue;
      }
      if (process.env[envName] === undefined) {
        errors.push({ line, column, message: `undefined variable "${inner}"` });
      }
      continue;
    }

    if (!(inner in merged)) {
      errors.push({ line, column, message: `undefined variable "${inner}"` });
    }
  }

  return errors;
}
