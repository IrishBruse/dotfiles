import react from "@vitejs/plugin-react";
import { defineConfig, type Connect, type Plugin } from "vite";

import { jiraBoard } from "./jira-board.ts";
import { vscodeTheme } from "./vscode-theme.ts";

function duckDuckGoRedirect(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/") {
      next();
      return;
    }

    const q = url.searchParams.get("q");
    if (!q) {
      next();
      return;
    }

    const target = new URL("https://duckduckgo.com/");
    target.searchParams.set("q", q);
    res.writeHead(302, { Location: target.toString() });
    res.end();
  };

  return {
    name: "duckduckgo-redirect",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), vscodeTheme(), jiraBoard(), duckDuckGoRedirect()],
  server: {
    port: 54321
  },
  preview: {
    port: 54321
  }
});
