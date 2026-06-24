import JiraWidget from "../components/JiraWidget.tsx";
import PortManagerWidget from "../components/PortManagerWidget.tsx";

export default function Landing() {
  return (
    <main className="dashboard-landing">
      <JiraWidget />
      <PortManagerWidget />
    </main>
  );
}
