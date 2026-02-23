"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface Task {
  id: string;
  title: string;
  description: string;
  agentId: string;
  agentKey: string;
  column: ColumnKey;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  comments: Array<{ text: string; by: string; at: string }>;
  source: string;
}

interface AgentOption {
  key: string;
  emoji: string;
  role: string;
  dirName?: string;
}

type ColumnKey = "backlog" | "queue" | "working" | "review" | "done";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  icon: string;
  color: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "backlog", label: "Backlog", icon: "📋", color: "#6b7280" },
  { key: "queue", label: "Queue", icon: "▶️", color: "#f59e0b" },
  { key: "working", label: "Working", icon: "⚡", color: "#38bdf8" },
  { key: "review", label: "Review", icon: "👀", color: "#a78bfa" },
  { key: "done", label: "Done", icon: "✅", color: "#00c691" },
];

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/mc-tasks");
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetch("/api/agents").then((r) => r.ok ? r.json() : []).then(setAgents).catch(() => {});
    const i = setInterval(fetchTasks, 10000);
    return () => clearInterval(i);
  }, [fetchTasks]);

  const moveTask = async (id: string, column: ColumnKey) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, column } : t));
    setSelectedTask((prev) => prev?.id === id ? { ...prev, column } : prev);
    await fetch(`/api/mc-tasks/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column }),
    });
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTask(null);
    await fetch(`/api/mc-tasks/${id}`, { method: "DELETE" });
  };

  const assignTask = async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, column: "working" as ColumnKey } : t));
    await fetch(`/api/mc-tasks/${id}/assign`, { method: "POST" });
  };

  const syncGSD = async () => {
    setSyncing(true);
    try {
      await fetch("/api/gsd-sync", { method: "POST" });
      await fetchTasks();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          Task Board
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={syncGSD} disabled={syncing} style={{ background: "#1a1a2a", color: "#7c8aff", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: syncing ? 0.5 : 1 }}>
            {syncing ? "⏳" : "🔄"} Sync GSD
          </button>
          <button onClick={() => setShowModal(true)} style={{ background: "#00c691", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + Nueva Tarea
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "start" }}>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col.key);
          return (
            <div key={col.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "8px 10px", background: "#0f0f0f", borderRadius: 6, border: "1px solid #1a1a1a" }}>
                <span>{col.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#888", flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: 10, color: "#444", background: "#1a1a1a", borderRadius: 10, padding: "1px 6px" }}>{colTasks.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 100 }}>
                {colTasks.length === 0 ? (
                  <div style={{ border: "1px dashed #1a1a1a", borderRadius: 8, padding: 24, textAlign: "center", color: "#333", fontSize: 11 }}>Sin tareas</div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} color={col.color} columnKey={col.key} onClick={() => setSelectedTask(task)} onAssign={() => assignTask(task.id)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <DetailPanel task={selectedTask} columns={COLUMNS} onMove={moveTask} onDelete={deleteTask} onAssign={assignTask} onClose={() => setSelectedTask(null)} />
      )}

      {showModal && (
        <NewTaskModal agents={agents} onSubmit={async (data) => {
          await fetch("/api/mc-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          await fetchTasks();
          setShowModal(false);
        }} onClose={() => setShowModal(false)} />
      )}
    </Shell>
  );
}

function TaskCard({ task, color, columnKey, onClick, onAssign }: { task: Task; color: string; columnKey: ColumnKey; onClick: () => void; onAssign: () => void }) {
  const [hovered, setHovered] = useState(false);
  const agentEmoji = task.agentKey ? (task.agentKey === "K" ? "👾" : "🤖") : "";

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "#161616" : "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: 12, borderLeft: `3px solid ${color}`, cursor: "pointer", transition: "background 150ms ease", position: "relative" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>{task.title}</div>
      {task.agentKey && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span>{agentEmoji}</span><span>{task.agentKey}</span>
        </div>
      )}
      {task.description && (
        <p style={{ fontSize: 11, color: "#666", margin: "0 0 6px 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#444" }}>{formatRelativeTime(task.updatedAt)}</span>
        {columnKey === "queue" && (
          <button onClick={(e) => { e.stopPropagation(); onAssign(); }}
            style={{ background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 4, padding: "2px 8px", color: "#00c691", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            ▶️ Go
          </button>
        )}
      </div>
      {task.source !== "kanban" && (
        <span style={{ position: "absolute", top: 6, right: 8, fontSize: 9, color: "#444", background: "#1a1a1a", padding: "1px 4px", borderRadius: 3 }}>{task.source}</span>
      )}
    </div>
  );
}

function DetailPanel({ task, columns, onMove, onDelete, onAssign, onClose }: {
  task: Task; columns: ColumnDef[]; onMove: (id: string, col: ColumnKey) => void; onDelete: (id: string) => void; onAssign: (id: string) => void; onClose: () => void;
}) {
  const current = columns.find((c) => c.key === task.column)!;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, background: "#111", borderLeft: "1px solid #2a2a2a", zIndex: 901, display: "flex", flexDirection: "column", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: current.color, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{current.icon} {current.label}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#ededed", margin: "0 0 12px 0" }}>{task.title}</h3>
          {task.agentKey && <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>{task.agentKey}</div>}
          {task.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descripción</div>
              <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{task.description}</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Creada</div><div style={{ fontSize: 12, color: "#888" }}>{formatRelativeTime(task.createdAt)}</div></div>
            <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Actualizada</div><div style={{ fontSize: 12, color: "#888" }}>{formatRelativeTime(task.updatedAt)}</div></div>
            <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Fuente</div><div style={{ fontSize: 12, color: "#888" }}>{task.source}</div></div>
          </div>

          {task.column === "queue" && (
            <button onClick={() => onAssign(task.id)}
              style={{ width: "100%", background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 6, padding: "10px", color: "#00c691", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 16 }}>
              ▶️ Go — Asignar y Comenzar
            </button>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Mover a</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {columns.filter((c) => c.key !== task.column).map((c) => (
                <button key={c.key} onClick={() => onMove(task.id, c.key)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 6, padding: "8px 12px", color: "#ccc", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  <span>{c.icon}</span><span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {task.comments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", marginBottom: 8 }}>Comentarios</div>
              {task.comments.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "#999", marginBottom: 6, padding: "6px 8px", background: "#0f0f0f", borderRadius: 4 }}>
                  <span style={{ color: "#666" }}>{c.by} · {formatRelativeTime(c.at)}</span>
                  <p style={{ margin: "4px 0 0 0" }}>{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1f1f1f" }}>
          <button onClick={() => onDelete(task.id)}
            style={{ width: "100%", background: "#1a1111", border: "1px solid #3a1a1a", borderRadius: 6, padding: "8px 12px", color: "#e55", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Eliminar tarea
          </button>
        </div>
      </div>
    </>
  );
}

function NewTaskModal({ agents, onSubmit, onClose }: {
  agents: AgentOption[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [agent, setAgent] = useState("");
  const [column, setColumn] = useState<ColumnKey>("backlog");
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);

  const enhance = async () => {
    if (!desc.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: desc }),
      });
      if (res.ok) {
        const { enhanced } = await res.json();
        if (enhanced) setDesc(enhanced);
      }
    } finally {
      setEnhancing(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const sel = agents.find((a) => a.key === agent);
    await onSubmit({
      title: title.trim(),
      description: desc.trim(),
      agentId: sel?.dirName || sel?.key?.toLowerCase() || "",
      agentKey: sel?.key || "",
      column,
      source: "kanban",
    });
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 12px", color: "#e8e8e8", fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, width: 420, maxWidth: "90vw" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#ededed", margin: "0 0 20px 0" }}>Nueva Tarea</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Título</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la tarea" autoFocus style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) submit(); }} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 11, color: "#888" }}>Descripción</label>
                <button onClick={enhance} disabled={enhancing || !desc.trim()}
                  style={{ background: "none", border: "1px solid #2a2a3a", borderRadius: 4, padding: "2px 8px", color: enhancing ? "#555" : "#7c8aff", fontSize: 11, cursor: enhancing ? "default" : "pointer", fontFamily: "inherit" }}>
                  {enhancing ? "⏳ Mejorando..." : "✨ Mejorar"}
                </button>
              </div>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalles de la tarea…" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Agente</label>
              <select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Sin asignar</option>
                {agents.map((a) => <option key={a.key} value={a.key}>{a.emoji} {a.key} — {a.role}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Columna</label>
              <select value={column} onChange={(e) => setColumn(e.target.value as ColumnKey)} style={{ ...inputStyle, cursor: "pointer" }}>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 16px", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={submit} disabled={!title.trim() || saving}
              style={{ background: title.trim() ? "#00c691" : "#1a3a2a", color: title.trim() ? "#0a0a0a" : "#555", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: title.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
              {saving ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
