/// <reference types="vite/client" />

declare module "virtual:vscode-theme.css";
declare module "virtual:jira-board" {
  import type { BoardData } from "./jira/types.ts";
  const data: BoardData;
  export default data;
}
