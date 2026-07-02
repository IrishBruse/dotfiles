import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { githubVersions } from "./github-versions.ts";
import { jiraBoard } from "./jira-board.ts";
import { localPorts } from "./local-ports.ts";
import { vscodeTheme } from "./vscode-theme.ts";

export default defineConfig({
  plugins: [react(), vscodeTheme(), jiraBoard(), githubVersions(), localPorts()],
  server: {
    port: 54321
  },
  preview: {
    port: 54321
  }
});
