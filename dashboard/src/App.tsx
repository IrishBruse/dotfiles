import { BrowserRouter, Route, Routes } from "react-router-dom";

import CommandPalette from "./components/CommandPalette.tsx";
import { CommandPaletteProvider } from "./command-palette/CommandPaletteContext.tsx";
import Landing from "./pages/Landing.tsx";
import JiraPage from "./pages/JiraPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <CommandPaletteProvider>
        <div className="dashboard-app">
          <CommandPalette />
          <div className="dashboard-app-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/jira" element={<JiraPage />} />
            </Routes>
          </div>
        </div>
      </CommandPaletteProvider>
    </BrowserRouter>
  );
}
