export type StowAction = "stow" | "unstow" | "restow";

/** Parsed GNU stow -v 2 output grouped for display. */
export interface StowSummary {
  linked: string[];
  removed: string[];
  unchanged: string[];
  warnings: string[];
  conflicts: string[];
}

export interface StowOptions {
  action: StowAction;
  listUnchanged: boolean;
  raw: boolean;
  interactive: boolean;
}
