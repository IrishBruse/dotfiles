import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home.tsx";
import JiraPage from "./pages/JiraPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jira" element={<JiraPage />} />
      </Routes>
    </BrowserRouter>
  );
}
