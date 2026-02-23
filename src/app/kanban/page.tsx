"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface AgentInfo {
  key: string;
  emoji: string;
  role: string;
  status: string;
  lastActivity: string | null;
}

interface ActivityEvent {
  agent: string;
  label: string;
  timestamp: string;
}

interface AgentTask {
  agent: AgentInfo;
  lastMessage: string;
  lastTimestamp: string | null;
  column: "idle" | "working" | "review" | "done";
}

type Column = { key: AgentTask["column"]; label: string; icon: string; color: string };

const COLUMNS: Column[] = [
  { key: "idle", label: "Idle", icon: "🕐", color: "#6b7280" },
  { key: "working", label: "Trabajando", icon: "⚡", color: "#38bdf8" },
  { key: "review", label: "En Revisión", icon: "👀", color: "#a78bfa" },
  { key: "done", label: "Completado", icon: "✅", color: "#00c691" },
];

// Persisted review/done state in localStorage
function getManualState(): Record<string, "review" | "done"> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("mc-kanban-state") || "{}");
  } catch {
    return {};
  }
}

function setManualState(state: Record<string, "review" | "done">) {
  localStorage.setItem("mc-kanban-state", JSON.stringify(state));
}

export default function KanbanPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [manualState, setManualStateLocal] = useState<Record<string, "review" | "done">>({});
  const [assignText, setAssignText] = useState<Record<string, string>>({});
  const [adjustText, setAdjustText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [agRes, acRes] = await Promise.all([fetch("/api/agents"), fetch("/api/activity")]);
      if (agRes.ok) setAgents(await agRes.json());
      if (acRes.ok) setActivity(await acRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setManualStateLocal(getManualState());
    fetchData();
    const i = setInterval(fetchData, 20000);
    return () => clearInterval(i);
  }, [fetchData]);

  // Build tasks from agents
  const tasks: AgentTask[] = agents.map((agent) => {
    // Find latest activity for this agent
    const agentActivity = activity.filter((e) => e.agent === agent.key);
    const latest = agentActivity[0];

    // Check manual overrides
    const manual = manualState[agent.key];
    if (manual) {
      return {
        agent,
        lastMessage: latest?.label || "Sin actividad",
        lastTimestamp: latest?.timestamp || agent.lastActivity,
        column: manual,
      };
    }

    // Auto-classify
    let column: AgentTask["column"] = "idle";
    if (agent.status === "online") {
      column = "working";
    } else if (agent.status === "idle") {
      // Check if last activity was <10min ago
      if (agent.lastActivity) {
        const diff = Date.now() - new Date(agent.lastActivity).getTime();
        column = diff < 10 * 60 * 1000 ? "working" : "idle";
      }
    }

    return {
      agent,
      lastMessage: latest?.label || "Sin actividad",
      lastTimestamp: latest?.timestamp || agent.lastActivity,
      column,
    };
  });

  const updateManual = (agentKey: string, col: "review" | "done" | null) => {
    const next = { ...manualState };
    if (col === null) {
      delete next[agentKey];
    } else {
      next[agentKey] = col;
    }
    setManualState(next);
    setManualStateLocal(next);
  };

  const assignTask = async (agentKey: string) => {
    const message = assignText[agentKey]?.trim();
    if (!message) return;
    setSending(agentKey);
    try {
      const res = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, message }),
      });
      if (res.ok) {
        setAssignText((prev) => ({ ...prev, [agentKey]: "" }));
        // Remove from manual state so it goes to "working"
        updateManual(agentKey, null);
        fetchData();
      }
    } finally {
      setSending(null);
    }
  };

  const sendAdjustment = async (agentKey: string) => {
    const message = adjustText[agentKey]?.trim();
    if (!message) return;
    setSending(agentKey);
    try {
      const res = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, message: `🔄 Ajuste solicitado: ${message}` }),
      });
      if (res.ok) {
        setAdjustText((prev) => ({ ...prev, [agentKey]: "" }));
        updateManual(agentKey, null);
        fetchData();
      }
    } finally {
      setSending(null);
    }
  };

  return (
    <Shell>
      <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
        Agent Task Manager
      </h2>

      {loading ? (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0" }}>Cargando…</div>
      ) : (
        <div className="kanban-board" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", alignItems: "start" }}>
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.key);
            return (
              <div key={col.key} className="kanban-col">
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", padding: "8px 10px", background: "#0f0f0f", borderRadius: "6px", border: "1px solid #1a1a1a" }}>
                  <span>{col.icon}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#888", flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: "10px", color: "#444", background: "#1a1a1a", borderRadius: "10px", padding: "1px 6px" }}>{colTasks.length}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", minHeight: "100px" }}>
                  {colTasks.length === 0 ? (
                    <div style={{ border: "1px dashed #1a1a1a", borderRadius: "8px", padding: "20px", textAlign: "center", color: "#333", fontSize: "11px" }}>
                      Vacío
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.agent.key}
                        style={{
                          background: "#111",
                          border: "1px solid #1f1f1f",
                          borderRadius: "8px",
                          padding: "12px",
                          borderLeft: `3px solid ${col.color}`,
                        }}
                      >
                        {/* Agent header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "20px" }}>{task.agent.emoji}</span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#ededed" }}>{task.agent.key}</div>
                            <div style={{ fontSize: "10px", color: "#555" }}>{task.agent.role}</div>
                          </div>
                        </div>

                        {/* Task description */}
                        <p style={{ fontSize: "11px", color: "#888", margin: "0 0 6px 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {task.lastMessage}
                        </p>

                        {/* Timestamp */}
                        <div style={{ fontSize: "10px", color: "#444", marginBottom: "8px" }}>
                          {formatRelativeTime(task.lastTimestamp)}
                        </div>

                        {/* Actions based on column */}
                        {col.key === "idle" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <textarea
                              placeholder="Asignar tarea…"
                              value={assignText[task.agent.key] || ""}
                              onChange={(e) => setAssignText((prev) => ({ ...prev, [task.agent.key]: e.target.value }))}
                              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: "4px", padding: "6px 8px", color: "#ccc", fontSize: "11px", resize: "vertical", minHeight: "40px", fontFamily: "inherit" }}
                            />
                            <button
                              onClick={() => assignTask(task.agent.key)}
                              disabled={sending === task.agent.key || !assignText[task.agent.key]?.trim()}
                              style={{ background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: "4px", padding: "4px 8px", color: "#00c691", fontSize: "11px", cursor: "pointer", opacity: sending === task.agent.key ? 0.5 : 1 }}
                            >
                              📋 {sending === task.agent.key ? "Enviando…" : "Asignar tarea"}
                            </button>
                          </div>
                        )}

                        {col.key === "working" && (
                          <button
                            onClick={() => updateManual(task.agent.key, "review")}
                            style={{ background: "#1a1a3a", border: "1px solid #2a2a5a", borderRadius: "4px", padding: "4px 8px", color: "#a78bfa", fontSize: "11px", cursor: "pointer", width: "100%" }}
                          >
                            👀 Mover a revisión
                          </button>
                        )}

                        {col.key === "review" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => updateManual(task.agent.key, "done")}
                                style={{ flex: 1, background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: "4px", padding: "4px 8px", color: "#00c691", fontSize: "11px", cursor: "pointer" }}
                              >
                                ✅ Aprobar
                              </button>
                              <button
                                onClick={() => updateManual(task.agent.key, null)}
                                style={{ background: "#1a1a2a", border: "1px solid #2a2a4a", borderRadius: "4px", padding: "4px 8px", color: "#888", fontSize: "11px", cursor: "pointer" }}
                              >
                                ↗️
                              </button>
                            </div>
                            <textarea
                              placeholder="Pedir ajustes…"
                              value={adjustText[task.agent.key] || ""}
                              onChange={(e) => setAdjustText((prev) => ({ ...prev, [task.agent.key]: e.target.value }))}
                              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: "4px", padding: "6px 8px", color: "#ccc", fontSize: "11px", resize: "vertical", minHeight: "32px", fontFamily: "inherit" }}
                            />
                            {adjustText[task.agent.key]?.trim() && (
                              <button
                                onClick={() => sendAdjustment(task.agent.key)}
                                disabled={sending === task.agent.key}
                                style={{ background: "#3a2a1a", border: "1px solid #5a3a2a", borderRadius: "4px", padding: "4px 8px", color: "#f59e0b", fontSize: "11px", cursor: "pointer" }}
                              >
                                🔄 Enviar ajustes
                              </button>
                            )}
                          </div>
                        )}

                        {col.key === "done" && (
                          <button
                            onClick={() => updateManual(task.agent.key, null)}
                            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "4px 8px", color: "#555", fontSize: "11px", cursor: "pointer", width: "100%" }}
                          >
                            ↩️ Resetear
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
