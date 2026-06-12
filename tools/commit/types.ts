import type { CommitRule } from "./config/config.ts";

export interface StagedFile {
  status: "A" | "M" | "D" | "R" | "C";
  path: string;
  previousPath?: string;
}

export type CommitType =
  | "feature"
  | "fix"
  | "refactor"
  | "tests"
  | "docs"
  | "chore"
  | "build"
  | "ci";

export interface StaticCommitAnalysis {
  confidence: number;
  type: CommitType;
  scope: string;
  summary: string;
}

export interface PrSplitSlice {
  paths: string[];
  message: string;
}

export interface SplitResult {
  committed: boolean;
}

export interface MessageVars {
  summary: string;
  type?: CommitType;
  scope?: string;
}

export interface ConfigMatch {
  rule: CommitRule;
  capturedScope?: string;
}
