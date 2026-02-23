"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/agents";

interface AgentInfo {
  key: string;
  dirName?: string;
  emoji: string;
  role: string;
  model: string;
  status: string;
  lastActivity: string | null;
  totalTokens: number;
  sessionCount?: number;
}

interface Props {
  agent: AgentInfo | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  online: "#00c691",
  idle: "#f59e0b",
  offline: "#ef4444",
};

const AGENT_FILES = ["SOUL.md", "AGENTS.md", "TOOLS.md", "USER.md", "IDENTITY.md", "HEARTBEAT.md"];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function AgentDrawer({ agent, onClose }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const dirName = agent?.dirName || agent?.key?.toLowerCase() || "";

  const loadFile = useCallback(async (filename: string) => {
    if (!dirName) return;
    try {
      const res = await fetch(`/api/files?agent=${dirName}&path=${filename}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
        setDirty(false);
      } else {
        setFileContent("(archivo no encontrado)");
      }
    } catch {
      setFileContent("(error leyendo archivo)");
    }
  }, [dirName]);

  useEffect(() => {
    setSelectedFile(null);
    setFileContent("");
    setDirty(false);
  }, [agent?.key]);

  const saveFile = async () => {
    if (!selectedFile || !dirName) return;
    setSaving(true);
    try {
      await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: dirName, path: selectedFile, content: fileContent }),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {agent && <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: 480,
        background: "#0f0f0f", borderLeft: "1px solid #1f1f1f",
        transform: agent ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms ease", zIndex: 50,
        display: "flex", flexDirection: "column",
      }}>
        {agent && (
          <>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{agent.emoji}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#ededed" }}>{agent.key}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{agent.role}</div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[agent.status] || "#555", display: "inline-block", marginLeft: 4 }} />
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Info Cards */}
            <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <InfoCard label="Modelo" value={agent.model.replace("claude-", "").replace("anthropic/", "")} />
              <InfoCard label="Tokens" value={formatTokens(agent.totalTokens)} />
              <InfoCard label="Última act." value={formatRelativeTime(agent.lastActivity)} />
            </div>

            {/* File Tree */}
            <div style={{ padding: "0 20px 8px", borderBottom: "1px solid #1f1f1f" }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Archivos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {AGENT_FILES.map((f) => (
                  <button key={f} onClick={() => { setSelectedFile(f); loadFile(f); }}
                    style={{
                      background: selectedFile === f ? "#1a2a1a" : "#0a0a0a",
                      border: `1px solid ${selectedFile === f ? "#2a5a3a" : "#1f1f1f"}`,
                      borderRadius: 4, padding: "4px 8px", color: selectedFile === f ? "#00c691" : "#888",
                      fontSize: 11, cursor: "pointer", fontFamily: "var(--font-geist-mono)",
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div style={{ flex: 1, padding: "12px 20px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {selectedFile ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-geist-mono)" }}>{selectedFile}</span>
                    <button onClick={saveFile} disabled={!dirty || saving}
                      style={{ background: dirty ? "#1a3a2a" : "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "3px 10px", color: dirty ? "#00c691" : "#555", fontSize: 11, cursor: dirty ? "pointer" : "default", fontFamily: "inherit" }}>
                      {saving ? "Guardando..." : dirty ? "💾 Guardar" : "Guardado"}
                    </button>
                  </div>
                  <textarea
                    value={fileContent}
                    onChange={(e) => { setFileContent(e.target.value); setDirty(true); }}
                    style={{
                      flex: 1, background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 6,
                      padding: 12, color: "#ccc", fontSize: 12, fontFamily: "var(--font-geist-mono)",
                      resize: "none", outline: "none", lineHeight: 1.5, minHeight: 300,
                    }}
                  />
                </>
              ) : (
                <div style={{ color: "#333", fontSize: 12, textAlign: "center", paddingTop: 40 }}>
                  Selecciona un archivo para editar
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
