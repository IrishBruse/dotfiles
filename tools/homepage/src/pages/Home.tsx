import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="home-landing">
      <div className="home-landing-inner">
        <h1>homepage</h1>
        <form className="home-search" action="/" method="get">
          <input
            name="q"
            type="search"
            placeholder="Search the web..."
            aria-label="Search"
            autoFocus
          />
        </form>
        <nav className="home-nav">
          <Link to="/jira">Jira</Link>
        </nav>
      </div>
    </main>
  );
}
