"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface Agent {
  key: string;
  emoji: string;
  role: string;
  status: string;
  lastActivity: string | null;
  avatarUrl?: string;
}

const STATUS_BORDER: Record<string, string> = {
  online: "#00c691",
  idle: "#f59e0b",
  offline: "#333",
};

function getPosition(index: number, total: number) {
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const cellW = 100 / cols;
  const cellH = 100 / Math.ceil(total / cols);
  const jitterX = ((index * 37 + 13) % 20) - 10;
  const jitterY = ((index * 53 + 7) % 20) - 10;
  return {
    left: `calc(${cellW * col + cellW / 2}% + ${jitterX}px - 40px)`,
    top: `calc(${cellH * row + cellH / 2}% + ${jitterY}px - 50px)`,
  };
}

export default function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    const i = setInterval(fetchAgents, 15000);
    return () => clearInterval(i);
  }, [fetchAgents]);

  return (
    <Shell>
      <style>{`
        @keyframes drift {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(8px, -12px) rotate(1.5deg); }
          50% { transform: translate(-6px, -8px) rotate(-1deg); }
          75% { transform: translate(10px, 6px) rotate(2deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes pulse-aura {
          0% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.15); }
          100% { opacity: 0.4; transform: scale(1); }
        }
      `}</style>

      <h2 style={{
        fontSize: "13px",
        fontWeight: 600,
        color: "var(--text-muted, #555)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 12px 0",
      }}>
        La Oficina
      </h2>

      <div style={{
        position: "relative",
        height: "calc(100vh - 130px)",
        background: "var(--bg, #0a0a0a)",
        borderRadius: "12px",
        border: "1px solid var(--border, #1f1f1f)",
        overflow: "hidden",
        backgroundImage: "radial-gradient(circle, #222 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted, #555)", fontSize: "13px" }}>
            Cargando...
          </div>
        ) : agents.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted, #555)", fontSize: "13px" }}>
            Sin agentes
          </div>
        ) : (
          agents.map((agent, i) => {
            const pos = getPosition(i, agents.length);
            const isOnline = agent.status === "online";
            const isIdle = agent.status === "idle";
            const isOffline = agent.status === "offline";
            const borderColor = STATUS_BORDER[agent.status] || STATUS_BORDER.offline;
            const driftDuration = 15 + ((i * 7) % 11);
            const tooltip = `${agent.key} (${agent.role})\nEstado: ${agent.status}\n${agent.lastActivity ? `Actividad: ${formatRelativeTime(agent.lastActivity)}` : "Sin actividad"}`;

            return (
              <div
                key={agent.key}
                title={tooltip}
                onClick={() => router.push(`/editor?agent=${agent.key}`)}
                style={{
                  position: "absolute",
                  left: pos.left,
                  top: pos.top,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  animation: isOnline ? `drift ${driftDuration}s ease-in-out infinite` : undefined,
                  filter: isOffline ? "grayscale(1)" : undefined,
                  opacity: isOffline ? 0.4 : 1,
                  transition: "opacity 0.3s",
                }}
              >
                <div style={{ position: "relative" }}>
                  {isIdle && (
                    <div style={{
                      position: "absolute",
                      inset: "-6px",
                      borderRadius: "50%",
                      background: "rgba(245, 158, 11, 0.25)",
                      animation: "pulse-aura 3s ease-in-out infinite",
                      pointerEvents: "none",
                    }} />
                  )}
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "var(--surface, #1a1a1a)",
                    border: `2px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                  }}>
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.key}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                      />
                    ) : (
                      <span style={{ fontSize: "36px", lineHeight: 1 }}>{agent.emoji}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: "11px",
                  color: "var(--text-muted, #555)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}>
                  {agent.key}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Shell>
  );
}
