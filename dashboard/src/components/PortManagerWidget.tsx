import { useCallback, useEffect, useState } from "react";

type LocalPort = {
  port: number;
  address: string;
  process: string;
  folder: string;
  cwd: string | null;
  pid: number;
};

const POLL_MS = 3000;

function portUrl(port: LocalPort): string {
  if (port.address.startsWith("[")) {
    return `http://${port.address}`;
  }
  const host = port.address.replace(/:\d+$/, "");
  if (host === "0.0.0.0" || host === "*") {
    return `http://127.0.0.1:${port.port}`;
  }
  return `http://${port.address}`;
}

function BinIcon() {
  return (
    <svg
      className="dashboard-ports-kill-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M11 3.5h2v1H3v-1h2l.5-1h3l.5 1zM4.1 5h7.8l-.65 7.35c-.05.55-.5 1-1.05 1H5.8c-.55 0-1-.45-1.05-1L4.1 5zm2.4 1.2v5.1h1V6.2h-1zm2 0v5.1h1V6.2h-1z"
      />
    </svg>
  );
}

export default function PortManagerWidget() {
  const [ports, setPorts] = useState<LocalPort[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ports");
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        ports?: LocalPort[];
      };
      if (!res.ok || !data.ok || !data.ports) {
        setError(data.error ?? "Port scan failed");
        return;
      }
      setError(null);
      setPorts(data.ports);
    } catch {
      setError("Port scan unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  const kill = useCallback(
    async (port: LocalPort) => {
      setKillingPid(port.pid);
      setError(null);
      try {
        const res = await fetch("/api/ports/kill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pid: port.pid })
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          ports?: LocalPort[];
        };
        if (!res.ok || !data.ok || !data.ports) {
          setError(data.error ?? "Kill failed");
          return;
        }
        setPorts(data.ports);
      } catch {
        setError("Kill failed");
      } finally {
        setKillingPid(null);
      }
    },
    []
  );

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <aside className="dashboard-ports-widget" aria-label="Local ports">
      <header className="dashboard-ports-widget-header">
        <h2 className="dashboard-ports-widget-title">Local ports</h2>
        <button
          type="button"
          className="dashboard-ports-widget-action"
          onClick={() => void refresh()}
          aria-label="Refresh ports"
          title="Refresh"
        >
          Refresh
        </button>
      </header>
      {error && (
        <p className="dashboard-ports-widget-error" role="status">
          {error}
        </p>
      )}
      {!error && !loading && ports.length === 0 && (
        <p className="dashboard-ports-widget-empty">No dev servers listening</p>
      )}
      {ports.length > 0 && (
        <ul className="dashboard-ports-list">
          {ports.map((port) => (
            <li key={`${port.pid}-${port.port}`}>
              <div className="dashboard-ports-row">
                <a
                  className="dashboard-ports-link"
                  href={portUrl(port)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="dashboard-ports-port">{port.port}</span>
                  <span
                    className="dashboard-ports-folder"
                    title={port.cwd ?? port.process}
                  >
                    {port.folder}
                  </span>
                </a>
                <button
                  type="button"
                  className="dashboard-ports-kill"
                  onClick={() => void kill(port)}
                  disabled={killingPid === port.pid}
                  aria-label={`Kill ${port.folder} on port ${port.port}`}
                  title={`Kill ${port.folder}`}
                >
                  <BinIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
