"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const STATUS_LABELS: Record<string, string> = {
  online: "🟢 Online",
  idle: "🟡 Idle",
  offline: "🔴 Offline",
};

const AGENT_FILES = ["SOUL.md", "USER.md", "HEARTBEAT.md", "TOOLS.md", "AGENTS.md"];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function AgentDrawer({ agent, onClose }: Props) {
  const router = useRouter();
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);

  const dirName = agent?.dirName || agent?.key?.toLowerCase() || "";

  // Check which files exist
  useEffect(() => {
    if (!dirName) return;
    setEditingFile(null);
    setFileContent("");
    setDirty(false);

    const checkFiles = async () => {
      const found: string[] = [];
      for (const f of AGENT_FILES) {
        try {
          const res = await fetch(`/api/files?agent=${dirName}&path=${f}`);
          if (res.ok) found.push(f);
        } catch { /* skip */ }
      }
      setExistingFiles(found);
    };
    checkFiles();
  }, [dirName]);

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

  const saveFile = async () => {
    if (!editingFile || !dirName) return;
    setSaving(true);
    try {
      await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: dirName, path: editingFile, content: fileContent }),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const resetSession = async () => {
    if (!agent) return;
    if (!confirm(`¿Reset sesión de ${agent.key}?`)) return;
    await fetch(`/api/agent-chat/${encodeURIComponent(agent.key)}/manage`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
  };

  return (
    <>
      {agent && <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}

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
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Status & Stats */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1f1f1f" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[agent.status] || "#555" }} />
                <span style={{ fontSize: 13, color: "#ccc" }}>
                  {STATUS_LABELS[agent.status] || agent.status} • {agent.model.replace("anthropic/", "")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <InfoCard label="Última act." value={formatRelativeTime(agent.lastActivity)} />
                <InfoCard label="Tokens" value={formatTokens(agent.totalTokens)} />
                <InfoCard label="Sesiones" value={String(agent.sessionCount || 0)} />
              </div>
            </div>

            {/* File editing or file list */}
            {editingFile ? (
              /* Editor View */
              <div style={{ flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => { setEditingFile(null); setDirty(false); }}
                      style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      ← Volver
                    </button>
                    <span style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-geist-mono)" }}>{editingFile}</span>
                  </div>
                  <button onClick={saveFile} disabled={!dirty || saving}
                    style={{ background: dirty ? "#1a3a2a" : "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "4px 12px", color: dirty ? "#00c691" : "#555", fontSize: 11, cursor: dirty ? "pointer" : "default", fontFamily: "inherit" }}>
                    {saving ? "Guardando..." : dirty ? "💾 Guardar" : "Guardado"}
                  </button>
                </div>
                <textarea
                  value={fileContent}
                  onChange={(e) => { setFileContent(e.target.value); setDirty(true); }}
                  style={{
                    flex: 1, background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 6,
                    padding: 12, color: "#ccc", fontSize: 12, fontFamily: "var(--font-geist-mono)",
                    resize: "none", outline: "none", lineHeight: 1.5,
                  }}
                />
              </div>
            ) : (
              /* File List View */
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
                <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  📁 Archivos del agente
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {AGENT_FILES.map((f) => {
                    const exists = existingFiles.includes(f);
                    return (
                      <div key={f} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", background: "#111", border: "1px solid #1f1f1f",
                        borderRadius: 6, opacity: exists ? 1 : 0.4,
                      }}>
                        <span style={{ fontSize: 12, color: "#ccc", fontFamily: "var(--font-geist-mono)" }}>
                          {exists ? "├── " : "├── "}{f}
                        </span>
                        {exists && (
                          <button onClick={() => { setEditingFile(f); loadFile(f); }}
                            style={{ background: "#1a1a2a", border: "1px solid #2a2a3a", borderRadius: 4, padding: "3px 10px", color: "#7c8aff", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                            Editar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!editingFile && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid #1f1f1f", display: "flex", gap: 8 }}>
                <button onClick={() => router.push(`/chat?agent=${agent.key}`)}
                  style={{ flex: 1, background: "#1a2a1a", border: "1px solid #2a5a3a", borderRadius: 6, padding: "10px", color: "#00c691", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  💬 Abrir chat
                </button>
                <button onClick={resetSession}
                  style={{ flex: 1, background: "#1a1111", border: "1px solid #3a1a1a", borderRadius: 6, padding: "10px", color: "#e55", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  🔄 Reset sesión
                </button>
              </div>
            )}
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
