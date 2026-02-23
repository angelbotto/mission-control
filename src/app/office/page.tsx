"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

// Load PixiJS tilemap world client-side only
const OfficeWorld = dynamic(() => import("@/components/OfficeWorld"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "#555",
      fontSize: "13px",
      gap: "8px",
    }}>
      <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
      Cargando oficina…
    </div>
  ),
});

interface AgentInfo {
  key: string;
  emoji: string;
  role: string;
  status: string;
  lastActivity: string | null;
  avatarUrl?: string;
}

const AVATAR_MAP: Record<string, string> = {
  main:      "/avatars/k_avatar_official.png",
  assistant: "/avatars/vera_avatar.png",
  infra:     "/avatars/nexo_avatar.png",
  content:   "/avatars/pluma_avatar.png",
  coder:     "/avatars/arq_avatar.png",
  research:  "/avatars/oraculo_avatar.png",
  finance:   "/avatars/vault.png",
  design:    "/avatars/iris.png",
};

const AGENT_NAMES: Record<string, string> = {
  main:      "K",
  assistant: "Vera",
  infra:     "Nexo",
  content:   "Pluma",
  coder:     "Arq",
  research:  "Oráculo",
  finance:   "Vault",
  design:    "Iris",
  kathe:     "Kathe",
  stivens:   "Stivens",
  alejo:     "Alejo",
  alma:      "Alma",
};

const STATUS_LABELS: Record<string, string> = {
  online:  "En línea",
  idle:    "Inactivo",
  offline: "Desconectado",
};

const STATUS_COLORS: Record<string, string> = {
  online:  "#00c691",
  idle:    "#f59e0b",
  offline: "#555",
};

export default function OfficePage() {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });

  const handleAgentClick = useCallback((agent: AgentInfo, x: number, y: number) => {
    setSelectedAgent(agent);
    // Keep panel within viewport
    const panelW = 260;
    const panelH = 200;
    const px = Math.min(x + 20, window.innerWidth - panelW - 20);
    const py = Math.min(y - 20, window.innerHeight - panelH - 20);
    setPanelPos({ x: Math.max(20, px), y: Math.max(80, py) });
  }, []);

  const dismissPanel = useCallback(() => setSelectedAgent(null), []);

  return (
    <Shell>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}>
        <h2 style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-muted, #555)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: 0,
        }}>
          La Oficina
        </h2>

        {/* Legend */}
        <div style={{
          display: "flex",
          gap: "16px",
          fontSize: "11px",
          color: "var(--text-muted, #666)",
        }}>
          <span><span style={{ color: "#00c691" }}>●</span> Online</span>
          <span><span style={{ color: "#f59e0b" }}>●</span> Idle</span>
          <span><span style={{ color: "#555" }}>●</span> Offline</span>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        onClick={selectedAgent ? dismissPanel : undefined}
        style={{
          position: "relative",
          height: "calc(100vh - 130px)",
          background: "#0d0d14",
          borderRadius: "12px",
          border: "1px solid var(--border, #1f1f1f)",
          overflow: "hidden",
        }}
      >
        <OfficeWorld onAgentClick={handleAgentClick} />

        {/* Agent info panel */}
        {selectedAgent && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: panelPos.x,
              top: panelPos.y - 70, // adjust for Shell header offset
              width: "260px",
              background: "var(--surface, #141414)",
              border: "1px solid var(--border, #2a2a2a)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              padding: "16px",
              zIndex: 100,
              animation: "fadeIn 0.15s ease",
            }}
          >
            {/* Close */}
            <button
              onClick={dismissPanel}
              style={{
                position: "absolute",
                top: "10px",
                right: "12px",
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >×</button>

            {/* Avatar + name row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${STATUS_COLORS[selectedAgent.status] || "#333"}`,
                flexShrink: 0,
              }}>
                {AVATAR_MAP[selectedAgent.key] ? (
                  <img
                    src={AVATAR_MAP[selectedAgent.key]}
                    alt={selectedAgent.key}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    background: "#1e1e2e",
                  }}>
                    {selectedAgent.emoji}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text, #e0e0e0)" }}>
                  {AGENT_NAMES[selectedAgent.key] || selectedAgent.key}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted, #666)", marginTop: "2px" }}>
                  {selectedAgent.role}
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--text-muted, #888)",
              marginBottom: "8px",
            }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: STATUS_COLORS[selectedAgent.status] || "#555",
                flexShrink: 0,
              }} />
              {STATUS_LABELS[selectedAgent.status] || selectedAgent.status}
            </div>

            {/* Last activity */}
            {selectedAgent.lastActivity && (
              <div style={{ fontSize: "11px", color: "var(--text-muted, #666)", marginBottom: "14px" }}>
                Última actividad: {formatRelativeTime(selectedAgent.lastActivity)}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => router.push(`/editor?agent=${selectedAgent.key}`)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  background: "var(--accent, #7c3aed)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Ver archivos
              </button>
              <button
                onClick={() => router.push(`/chat?agent=${selectedAgent.key}`)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  background: "var(--surface-2, #1e1e2e)",
                  border: "1px solid var(--border, #2a2a2a)",
                  borderRadius: "6px",
                  color: "var(--text-muted, #888)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
