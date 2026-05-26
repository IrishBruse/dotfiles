export type InterpolationError = {
  line: number;
  column: number;
  message: string;
};

export type ExpandResult =
  | { ok: true; text: string }
  | { ok: false; errors: InterpolationError[] };

export type ExpandNamedPromptOptions = {
  promptsDir?: string;
  /** Working directory for `{{cwd}}` and ```! shell blocks. */
  cwd?: string;
  vars?: Record<string, string>;
  /** Extra placeholder values merged after built-in vars. */
  builtinOverrides?: Record<string, string>;
};
