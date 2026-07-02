/// <reference types="vite/client" />

declare module "virtual:vscode-theme.css";
declare module "virtual:github-versions-config" {
  import type { VersionsConfig } from "../github-versions.ts";
  const config: VersionsConfig;
  export default config;
}
declare module "virtual:jira-board" {
  import type { BoardData } from "./jira/types.ts";
  const data: BoardData;
  export default data;
}
