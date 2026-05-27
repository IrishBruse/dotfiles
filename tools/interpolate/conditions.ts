/** `?varname: text`, `?env:NAME: text`, or `?work:` (shortcut for `?env:WORK:`). */
const LINE_CONDITION_RE =
  /^\?((?:env:([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*))):\s?(.*)$/;

/** Line-condition names that read an environment variable instead of `vars`. */
const ENV_SHORTCUTS: Record<string, string> = {
  work: "WORK"
};

function isTruthyValue(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const v = value.trim();
  if (v === "" || v === "0") {
    return false;
  }
  if (v.toLowerCase() === "false") {
    return false;
  }
  return true;
}

function conditionMet(
  envName: string | undefined,
  varName: string | undefined,
  vars: Record<string, string>
): boolean {
  if (envName !== undefined) {
    return isTruthyValue(process.env[envName]);
  }
  if (varName !== undefined) {
    const envFromShortcut = ENV_SHORTCUTS[varName];
    if (envFromShortcut !== undefined) {
      return isTruthyValue(process.env[envFromShortcut]);
    }
    return isTruthyValue(vars[varName]);
  }
  return false;
}

/** Drop or unwrap lines prefixed with `?var:` / `?env:VAR:`. */
export function expandLineConditions(
  template: string,
  vars: Record<string, string>
): string {
  const out: string[] = [];
  for (const line of template.split("\n")) {
    const m = line.match(LINE_CONDITION_RE);
    if (m === null) {
      out.push(line);
      continue;
    }
    if (conditionMet(m[2], m[3], vars)) {
      out.push(m[4] ?? "");
    }
  }
  return out.join("\n");
}
