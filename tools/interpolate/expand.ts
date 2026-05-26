import { builtinVars, expandPatternBuiltins } from "./builtins/index.ts";
import { expandLineConditions } from "./conditions.ts";
import type { InterpolationError } from "./errors.ts";
import { findUndefinedVariables } from "./validate.ts";

/** Replace `{{key}}` placeholders; later keys in `vars` win over earlier passes. */
export function expandPlaceholders(
  template: string,
  vars: Record<string, string>
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
  builtinOverrides: Record<string, string> = {}
): ExpandResult {
  const merged = { ...builtinVars(), ...builtinOverrides, ...cliVars };
  const conditioned = expandLineConditions(template, merged);
  const errors = findUndefinedVariables(conditioned, {
    ...builtinOverrides,
    ...cliVars
  });
  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const expanded = expandPatternBuiltins(
    expandPlaceholders(conditioned, merged)
  );
  if (expanded.errors.length > 0) {
    return { ok: false as const, errors: expanded.errors };
  }
  return { ok: true as const, text: expanded.text };
}
