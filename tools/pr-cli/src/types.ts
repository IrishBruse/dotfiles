export type Mode = "add" | "update" | "open";

export type Parsed = {
  mode: Mode;
  pr: string | null;
  /** From `gh pr view` when `pr` is set; used for Jira title checks without a second `gh` call. */
  prTitle: string | null;
  /** Create-PR commands (`open`, `add`, `new`, `create`): optional Jira key. */
  ticket: string | null;
  workspace: string;
  agentForward: string[];
  /** Extra sentence for the agent when same HEAD as last run (auto only). */
  hint: string | null;
  /** Persist after agent exits 0 when both set. */
  stateKey: string | null;
  headOid: string | null;
};
