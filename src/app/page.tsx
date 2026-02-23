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

const STATUS_COLORS: Record<AgentStatus, string> = {
  online: "#00c691",
  idle: "#f59e0b",
  offline: "#ef4444",
};

function AgentCard({ agent }: { agent: AgentInfo }) {
  const statusColor = STATUS_COLORS[agent.status];
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {agent.status === "online" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, #00c691, #00c69140)",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "28px" }}>{agent.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#ededed" }}>
              {agent.key}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: statusColor,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}40`,
                borderRadius: "4px",
                padding: "1px 6px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: statusColor,
                  marginRight: "4px",
                  verticalAlign: "middle",
                  animation: agent.status === "online" ? "pulse-online 2s ease-in-out infinite" : "none",
                }}
              />
              {agent.status}
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "#666" }}>{agent.role}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#555" }}>Modelo</span>
          <span style={{ color: "#888", fontFamily: "var(--font-geist-mono)", fontSize: "11px" }}>
            {agent.model.replace("claude-", "")}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#555" }}>Actividad</span>
          <span style={{ color: "#888" }}>{formatRelativeTime(agent.lastActivity)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#555" }}>Sesiones</span>
          <span style={{ color: "#888" }}>{agent.sessionCount}</span>
        </div>
        {agent.totalTokens > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#555" }}>Tokens</span>
            <span style={{ color: "#888" }}>{(agent.totalTokens / 1000).toFixed(1)}K</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamStatusPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) setAgents(await res.json());
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
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", fontSize: "13px" }}>
        <span style={{ color: "#00c691" }}>● {online} online</span>
        <span style={{ color: "#f59e0b" }}>● {idle} idle</span>
        <span style={{ color: "#444" }}>● {offline} offline</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0" }}>Cargando agentes…</div>
      ) : (
        <>
          <div
            className="agents-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            {agents.map((a) => (
              <AgentCard key={a.key} agent={a} />
            ))}
          </div>

          {/* Network Health + Token Usage side by side */}
          <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
                Network Health
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" }}>
                {[
                  { label: "Online", value: online, color: "#00c691" },
                  { label: "Idle", value: idle, color: "#f59e0b" },
                  { label: "Offline", value: offline, color: "#ef4444" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "16px", height: "4px", background: "#1a1a1a", borderRadius: "2px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${agents.length > 0 ? (online / agents.length) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #00c691, #00a07a)",
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px 0" }}>
                Token Usage
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {agents
                  .filter((a) => a.totalTokens > 0)
                  .sort((a, b) => b.totalTokens - a.totalTokens)
                  .map((agent) => {
                    const max = Math.max(...agents.map((a) => a.totalTokens));
                    const pct = max > 0 ? (agent.totalTokens / max) * 100 : 0;
                    return (
                      <div key={agent.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontSize: "12px" }}>
                          <span style={{ color: "#888" }}>{agent.emoji} {agent.key}</span>
                          <span style={{ color: "#555", fontFamily: "var(--font-geist-mono)", fontSize: "11px" }}>
                            {(agent.totalTokens / 1000).toFixed(1)}K
                          </span>
                        </div>
                        <div style={{ height: "3px", background: "#1a1a1a", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#00c691", opacity: 0.6, borderRadius: "2px" }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
