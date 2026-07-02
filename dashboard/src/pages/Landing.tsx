import GithubVersionsWidget from "../components/GithubVersionsWidget.tsx";
import JiraWidget from "../components/JiraWidget.tsx";
import PortManagerWidget from "../components/PortManagerWidget.tsx";

export default function Landing() {
  return (
    <main className="dashboard-landing">
      <div className="dashboard-left-widgets">
        <GithubVersionsWidget />
        <JiraWidget />
      </div>
      <PortManagerWidget />
    </main>
  );
}
