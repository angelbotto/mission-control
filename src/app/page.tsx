"use client";

import { useEffect, useState, useCallback } from "react";
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
}

function AgentSkeleton() {
  return (
    <div className="agent-card">
      {[32, 12, 8, 8].map((h, i) => (
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

function AgentCard({ agent }: { agent: AgentInfo }) {
  return (
    <div className={`agent-card ${agent.status}`}>
      <span className="agent-emoji">{agent.emoji}</span>
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
        <div className="meta-item">
          <label>Sessions</label>
          <span>{agent.sessionCount}</span>
        </div>
        {agent.totalTokens > 0 && (
          <div className="meta-item">
            <label>Tokens</label>
            <span>{(agent.totalTokens / 1000).toFixed(1)}K</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamStatusPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchAgents();
    const i = setInterval(fetchAgents, 30000);
    return () => clearInterval(i);
  }, [fetchAgents]);

  const online = agents.filter((a) => a.status === "online").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const offline = agents.filter((a) => a.status === "offline").length;

  return (
    <Shell>
      {/* Summary bar */}
      <div className="summary-bar">
        <span style={{ color: "var(--online)" }}>● {online} online</span>
        <span style={{ color: "var(--idle)" }}>● {idle} idle</span>
        <span style={{ color: "var(--text-muted)" }}>● {offline} offline</span>
      </div>

      {error && (
        <div style={{ padding: 20, color: "var(--offline)", background: "var(--surface)", borderRadius: "var(--radius)", marginBottom: 16 }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="agents-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="agents-grid" style={{ marginBottom: 32 }}>
            {agents.map((a) => (
              <AgentCard key={a.key} agent={a} />
            ))}
          </div>

          {/* Network Health + Token Usage */}
          <div className="stats-row">
            <div className="stat-card">
              <h3>Network Health</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
                {[
                  { label: "Online", value: online, color: "var(--online)" },
                  { label: "Idle", value: idle, color: "var(--idle)" },
                  { label: "Offline", value: offline, color: "var(--offline)" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="progress-track" style={{ marginTop: 16 }}>
                <div
                  className="progress-bar"
                  style={{ width: `${agents.length > 0 ? (online / agents.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="stat-card">
              <h3>Token Usage</h3>
              {agents
                .filter((a) => a.totalTokens > 0)
                .sort((a, b) => b.totalTokens - a.totalTokens)
                .map((agent) => {
                  const max = Math.max(...agents.map((a) => a.totalTokens));
                  const pct = max > 0 ? (agent.totalTokens / max) * 100 : 0;
                  return (
                    <div key={agent.key} className="token-row">
                      <div className="token-row-header">
                        <span className="token-agent">{agent.emoji} {agent.key}</span>
                        <span className="token-value">{(agent.totalTokens / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="token-bar-track">
                        <div className="token-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
