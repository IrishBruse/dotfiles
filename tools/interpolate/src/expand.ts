import { builtinVars, expandPatternBuiltins } from "./builtins/index.ts";
import type { InterpolationError } from "./errors.ts";
import { findUndefinedVariables } from "./validate.ts";

/** Replace `{{key}}` placeholders; later keys in `vars` win over earlier passes. */
export function expandPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export type ExpandResult =
  | { ok: true; text: string }
  | { ok: false; errors: InterpolationError[] };

export function expandTemplate(
  template: string,
  cliVars: Record<string, string>,
): ExpandResult {
  const errors = findUndefinedVariables(template, cliVars);
  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const merged = { ...builtinVars(), ...cliVars };
  const expanded = expandPatternBuiltins(expandPlaceholders(template, merged));
  if (expanded.errors.length > 0) {
    return { ok: false as const, errors: expanded.errors };
  }
  return { ok: true as const, text: expanded.text };
}
