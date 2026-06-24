import JiraWidget from "../components/JiraWidget.tsx";

export default function Home() {
  return (
    <main className="home-landing">
      <JiraWidget />
      <div className="home-landing-inner">
        <h1>dashboard</h1>
        <form className="home-search" action="/" method="get">
          <input
            name="q"
            type="search"
            placeholder="Search the web..."
            aria-label="Search"
            autoFocus
          />
        </form>
      </div>
    </main>
  );
}
