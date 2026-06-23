import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "virtual:vscode-theme.css";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
