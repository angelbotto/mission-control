"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AgentStatus, formatRelativeTime } from "@/lib/agents";
import Shell from "@/components/Shell";

interface AgentInfo {
  key: string;
  emoji: string;
  role: string;
  model: string;
  status: AgentStatus;
  lastActivity: string | null;
  sessionCount: number;
  totalTokens: number;
  avatarUrl?: string;
}

interface ActivityEvent {
  id: string;
  agent: string;
  agentEmoji: string;
  timestamp: string;
  type: string;
  label: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function formatDateTime(date: Date): string {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const d = days[date.getDay()];
  const day = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${d} ${day} ${m} ${y}, ${hh}:${mm}:${ss}`;
}

function getTaskCounts(): { pending: number; review: number } {
  try {
    const raw = localStorage.getItem("mc-tasks-v2");
    if (!raw) return { pending: 0, review: 0 };
    const tasks = JSON.parse(raw) as { column?: string }[];
    const pending = tasks.filter((t) => t.column !== "done").length;
    const review = tasks.filter((t) => t.column === "review").length;
    return { pending, review };
  } catch {
    return { pending: 0, review: 0 };
  }
}

function AgentSkeleton() {
  return (
    <div className="agent-card">
      {[64, 14, 10, 10].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            background: "var(--surface-2)",
            borderRadius: 4,
            marginBottom: 10,
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
    </div>
  );
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentInfo;
  onClick: () => void;
}) {
  return (
    <div
      className={`agent-card ${agent.status}`}
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
    >
      {agent.avatarUrl ? (
        <img
          src={agent.avatarUrl}
          alt={agent.key}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: 12,
            display: "block",
          }}
        />
      ) : (
        <span className="agent-emoji" style={{ fontSize: 64, lineHeight: 1 }}>
          {agent.emoji}
        </span>
      )}
      <div className="agent-name">{agent.key}</div>
      <div className="agent-role">{agent.role}</div>
      <span className={`status-badge ${agent.status}`}>
        <span className="status-dot" />
        {agent.status}
      </span>
      <div className="agent-meta">
        <div className="meta-item">
          <label>Model</label>
          <span>{agent.model.replace("claude-", "")}</span>
        </div>
        <div className="meta-item">
          <label>Activity</label>
          <span>{formatRelativeTime(agent.lastActivity)}</span>
        </div>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [taskCounts, setTaskCounts] = useState({ pending: 0, review: 0 });

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setAgents(await res.json());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (!res.ok) return;
      const data: ActivityEvent[] = await res.json();
      setActivity(data.slice(0, 5));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchActivity();
    setTaskCounts(getTaskCounts());
    const agentInterval = setInterval(fetchAgents, 30_000);
    const activityInterval = setInterval(fetchActivity, 30_000);
    return () => {
      clearInterval(agentInterval);
      clearInterval(activityInterval);
    };
  }, [fetchAgents, fetchActivity]);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(clock);
  }, []);

  const online = agents.filter((a) => a.status === "online").length;
  const totalTokens = agents.reduce((sum, a) => sum + a.totalTokens, 0);

  return (
    <Shell>
      {/* ── Hero Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <span role="img" aria-label="satellite">🛰️</span>
            Mission Control
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {formatDateTime(now)}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent-dim)",
            color: "var(--accent)",
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--online)",
              animation: "pulse 2s infinite",
            }}
          />
          {online} / {agents.length} online
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            color: "var(--offline)",
            background: "var(--surface)",
            border: "1px solid var(--offline)",
            borderRadius: "var(--radius)",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* ── Quick Stats ── */}
      <div
        className="stats-row"
        style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 24 }}
      >
        <div className="stat-card" style={{ textAlign: "center" }}>
          <h3>Tokens consumidos</h3>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>
            {formatTokens(totalTokens)}
          </div>
        </div>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <h3>Tareas pendientes</h3>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--idle)" }}>
            {taskCounts.pending}
          </div>
        </div>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <h3>En revisión</h3>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
            {taskCounts.review}
          </div>
        </div>
      </div>

      {/* ── Agent Grid ── */}
      <div className="section-title">Agentes</div>
      {loading ? (
        <div className="agents-grid" style={{ marginBottom: 32 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="agents-grid" style={{ marginBottom: 32 }}>
          {agents.map((a) => (
            <AgentCard
              key={a.key}
              agent={a}
              onClick={() => router.push("/editor?agent=" + a.key)}
            />
          ))}
        </div>
      )}

      {/* ── Mini Activity Feed ── */}
      {activity.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ margin: 0 }}>Actividad reciente</h3>
            <a
              href="/activity"
              style={{
                fontSize: 12,
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Ver todo &rarr;
            </a>
          </div>
          <div className="activity-feed">
            {activity.map((ev) => (
              <div
                key={ev.id}
                className="activity-item"
                style={{ padding: "10px 20px" }}
              >
                <div className="activity-avatar">{ev.agentEmoji}</div>
                <div className="activity-content">
                  <span className="activity-agent">{ev.agent}</span>
                  <div
                    className="activity-text"
                    style={{ fontSize: 12 }}
                  >
                    {ev.label}
                  </div>
                </div>
                <span className="activity-time">
                  {formatRelativeTime(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
