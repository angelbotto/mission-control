"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface Task {
  id: string;
  title: string;
  description: string;
  agentKey: string;
  agentEmoji: string;
  column: "backlog" | "inprogress" | "review" | "done";
  createdAt: string;
  updatedAt: string;
}

interface AgentOption {
  key: string;
  emoji: string;
  role: string;
}

type ColumnKey = Task["column"];

interface ColumnDef {
  key: ColumnKey;
  label: string;
  icon: string;
  color: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "backlog", label: "Backlog", icon: "⬜", color: "#6b7280" },
  { key: "inprogress", label: "In Progress", icon: "⚡", color: "#38bdf8" },
  { key: "review", label: "Review", icon: "👀", color: "#a78bfa" },
  { key: "done", label: "Done", icon: "✅", color: "#00c691" },
];

const STORAGE_KEY = "mc-tasks-v2";

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAgent, setNewAgent] = useState("");
  const [newColumn, setNewColumn] = useState<ColumnKey>("backlog");

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    saveTasks(updated);
  }, []);

  useEffect(() => {
    setTasks(loadTasks());
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AgentOption[]) => setAgents(data))
      .catch(() => {});
  }, []);

  const addTask = () => {
    if (!newTitle.trim()) return;
    const agent = agents.find((a) => a.key === newAgent);
    const now = new Date().toISOString();
    const task: Task = {
      id: generateId(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      agentKey: agent?.key || "",
      agentEmoji: agent?.emoji || "👤",
      column: newColumn,
      createdAt: now,
      updatedAt: now,
    };
    persist([...tasks, task]);
    setNewTitle("");
    setNewDesc("");
    setNewAgent("");
    setNewColumn("backlog");
    setShowModal(false);
  };

  const moveTask = (id: string, column: ColumnKey) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, column, updatedAt: new Date().toISOString() } : t
    );
    persist(updated);
    setSelectedTask((prev) => (prev?.id === id ? { ...prev, column, updatedAt: new Date().toISOString() } : prev));
  };

  const deleteTask = (id: string) => {
    persist(tasks.filter((t) => t.id !== id));
    setSelectedTask(null);
  };

  const colForKey = (key: ColumnKey) => COLUMNS.find((c) => c.key === key)!;

  return (
    <Shell>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          Task Board
        </h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#00c691",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 6,
            padding: "7px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Nueva Tarea
        </button>
      </div>

      {/* Board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "start" }}>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col.key);
          return (
            <div key={col.key}>
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "8px 10px", background: "#0f0f0f", borderRadius: 6, border: "1px solid #1a1a1a" }}>
                <span>{col.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#888", flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: 10, color: "#444", background: "#1a1a1a", borderRadius: 10, padding: "1px 6px" }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 100 }}>
                {colTasks.length === 0 ? (
                  <div style={{ border: "1px dashed #1a1a1a", borderRadius: 8, padding: 24, textAlign: "center", color: "#333", fontSize: 11 }}>
                    Sin tareas
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      color={col.color}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-in detail panel */}
      {selectedTask && (
        <DetailPanel
          task={selectedTask}
          columns={COLUMNS}
          colForKey={colForKey}
          onMove={moveTask}
          onDelete={deleteTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* New task modal */}
      {showModal && (
        <NewTaskModal
          agents={agents}
          columns={COLUMNS}
          newTitle={newTitle}
          newDesc={newDesc}
          newAgent={newAgent}
          newColumn={newColumn}
          onTitleChange={setNewTitle}
          onDescChange={setNewDesc}
          onAgentChange={setNewAgent}
          onColumnChange={setNewColumn}
          onSubmit={addTask}
          onClose={() => setShowModal(false)}
        />
      )}
    </Shell>
  );
}

/* ─── Task Card ────────────────────────────────────────────────── */

function TaskCard({ task, color, onClick }: { task: Task; color: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#161616" : "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 8,
        padding: 12,
        borderLeft: `3px solid ${color}`,
        cursor: "pointer",
        transition: "background 150ms ease",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>{task.title}</div>

      {task.agentKey && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span>{task.agentEmoji}</span>
          <span>{task.agentKey}</span>
        </div>
      )}

      {task.description && (
        <p style={{
          fontSize: 11,
          color: "#666",
          margin: "0 0 6px 0",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {task.description}
        </p>
      )}

      <div style={{ fontSize: 10, color: "#444" }}>
        {formatRelativeTime(task.updatedAt)}
      </div>
    </div>
  );
}

/* ─── Detail Panel (slide-in from right) ───────────────────────── */

function DetailPanel({
  task,
  columns,
  colForKey,
  onMove,
  onDelete,
  onClose,
}: {
  task: Task;
  columns: ColumnDef[];
  colForKey: (key: ColumnKey) => ColumnDef;
  onMove: (id: string, col: ColumnKey) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const current = colForKey(task.column);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900 }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: "#111",
        borderLeft: "1px solid #2a2a2a",
        zIndex: 901,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-inter, Inter, sans-serif)",
      }}>
        {/* Panel header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: current.color,
            }} />
            <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{current.icon} {current.label}</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#ededed", margin: "0 0 12px 0", lineHeight: 1.3 }}>
            {task.title}
          </h3>

          {task.agentKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>{task.agentEmoji}</span>
              <span style={{ fontSize: 13, color: "#aaa" }}>{task.agentKey}</span>
            </div>
          )}

          {task.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descripción</div>
              <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{task.description}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Creada</div>
              <div style={{ fontSize: 12, color: "#888" }}>{formatRelativeTime(task.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Actualizada</div>
              <div style={{ fontSize: 12, color: "#888" }}>{formatRelativeTime(task.updatedAt)}</div>
            </div>
          </div>

          {/* Move buttons */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Mover a</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {columns
                .filter((c) => c.key !== task.column)
                .map((c) => (
                  <button
                    key={c.key}
                    onClick={() => onMove(task.id, c.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#0f0f0f",
                      border: "1px solid #1f1f1f",
                      borderRadius: 6,
                      padding: "8px 12px",
                      color: "#ccc",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "border-color 150ms ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = c.color; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1f1f1f"; }}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Panel footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1f1f1f" }}>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              width: "100%",
              background: "#1a1111",
              border: "1px solid #3a1a1a",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#e55",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Eliminar tarea
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── New Task Modal ───────────────────────────────────────────── */

function NewTaskModal({
  agents,
  columns,
  newTitle,
  newDesc,
  newAgent,
  newColumn,
  onTitleChange,
  onDescChange,
  onAgentChange,
  onColumnChange,
  onSubmit,
  onClose,
}: {
  agents: AgentOption[];
  columns: ColumnDef[];
  newTitle: string;
  newDesc: string;
  newAgent: string;
  newColumn: ColumnKey;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onAgentChange: (v: string) => void;
  onColumnChange: (v: ColumnKey) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0a0a0a",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "8px 12px",
    color: "#e8e8e8",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "#888",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
    display: "block",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            padding: 24,
            width: 420,
            maxWidth: "90vw",
            fontFamily: "var(--font-inter, Inter, sans-serif)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#ededed", margin: "0 0 20px 0" }}>Nueva Tarea</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Title */}
            <div>
              <label style={labelStyle}>Título</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Nombre de la tarea"
                autoFocus
                style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) onSubmit(); }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea
                value={newDesc}
                onChange={(e) => onDescChange(e.target.value)}
                placeholder="Detalles de la tarea…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
              />
            </div>

            {/* Agent selector */}
            <div>
              <label style={labelStyle}>Agente</label>
              <select
                value={newAgent}
                onChange={(e) => onAgentChange(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              >
                <option value="">Sin asignar</option>
                {agents.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.emoji} {a.key} — {a.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Column selector */}
            <div>
              <label style={labelStyle}>Columna</label>
              <select
                value={newColumn}
                onChange={(e) => onColumnChange(e.target.value as ColumnKey)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                padding: "7px 16px",
                color: "#888",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={!newTitle.trim()}
              style={{
                background: newTitle.trim() ? "#00c691" : "#1a3a2a",
                color: newTitle.trim() ? "#0a0a0a" : "#555",
                border: "none",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: newTitle.trim() ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
