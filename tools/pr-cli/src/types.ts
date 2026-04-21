export type Mode = "add" | "update" | "open";

/** Which argv subcommand produced this run (`pr` = default with no `review`/`update`). */
export type CliCommand = "pr" | "review" | "update" | "create";

export type Parsed = {
  command: CliCommand;
  mode: Mode;
  pr: string | null;
  /** From `gh pr view` when `pr` is set; used for Jira title checks without a second `gh` call. */
  prTitle: string | null;
  /** `pr create`: optional Jira key. */
  ticket: string | null;
  workspace: string;
  /** Extra sentence for the agent when same HEAD as last run (auto only). */
  hint: string | null;
  /** Persist after agent exits 0 when both set. */
  stateKey: string | null;
  headOid: string | null;
};
