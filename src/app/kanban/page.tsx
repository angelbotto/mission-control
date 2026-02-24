"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface ActivityEvent {
  id: string;
  type: "move" | "comment" | "create" | "subtask";
  taskId: string;
  taskTitle: string;
  agent: string;
  detail: string;
  timestamp: string;
}

const AGENT_EMOJI_MAP: Record<string, string> = {
  K: "\uD83E\uDDE0", Arq: "\uD83C\uDFD7\uFE0F", Vera: "\u26A1", Nexo: "\uD83D\uDDA5\uFE0F",
  Pluma: "\uD83D\uDD8A\uFE0F", "Oráculo": "\uD83D\uDD2C", Vault: "\uD83D\uDCB0", Iris: "\uD83C\uDFA8",
  Angel: "\uD83D\uDC64",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  move: "#38bdf8",
  comment: "#a78bfa",
  create: "#00c691",
  subtask: "#f59e0b",
};

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
  parentId?: string;
  taskType?: "request" | "improvement" | "bug" | "idea";
  attachments?: Array<{ name: string; url: string; addedBy: string; addedAt: string }>;
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

type DateFilter = "today" | "week" | "month" | "all" | "range";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "all", label: "Todo" },
  { key: "range", label: "Rango" },
];

const SOURCE_BADGES: Record<string, { bg: string; color: string; emoji: string; label: string }> = {
  telegram: { bg: "#1a2a3a", color: "#38bdf8", emoji: "📱", label: "Telegram" },
  kanban: { bg: "#1a1a1a", color: "#888", emoji: "📋", label: "Kanban" },
  gsd: { bg: "#1a1a2a", color: "#7c8aff", emoji: "⚡", label: "GSD" },
  cron: { bg: "#2a1a0a", color: "#f59e0b", emoji: "🕐", label: "Cron" },
  chat: { bg: "#2a1a2a", color: "#a78bfa", emoji: "💬", label: "Chat" },
  review: { bg: "#2a2a1a", color: "#fbbf24", emoji: "🔄", label: "Review" },
};

function getStoredFilter(): DateFilter {
  if (typeof window === "undefined") return "today";
  return (localStorage.getItem("mc-kanban-filter") as DateFilter) || "today";
}

function passesDateFilter(task: Task, filter: DateFilter, rangeFrom?: string, rangeTo?: string): boolean {
  if (filter === "all") return true;
  if (task.column === "working") return true;

  const now = new Date();
  const created = new Date(task.createdAt);
  const updated = new Date(task.updatedAt);

  if (filter === "today") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return created >= startOfDay || updated >= startOfDay;
  }
  if (filter === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    return created >= startOfWeek || updated >= startOfWeek;
  }
  if (filter === "range") {
    if (!rangeFrom && !rangeTo) return true;
    const from = rangeFrom ? new Date(rangeFrom) : new Date(0);
    const to = rangeTo ? new Date(rangeTo + "T23:59:59.999") : new Date();
    return (created >= from && created <= to) || (updated >= from && updated <= to);
  }
  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return created >= startOfMonth || updated >= startOfMonth;
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");


  useEffect(() => {
    setDateFilter(getStoredFilter());
    setRangeFrom(localStorage.getItem("mc-kanban-range-from") || "");
    setRangeTo(localStorage.getItem("mc-kanban-range-to") || "");
    setActivityOpen(localStorage.getItem("mc-activity-open") === "true");
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/mc-tasks/activity");
      if (res.ok) setActivityEvents(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchActivity();
    const i = setInterval(fetchActivity, 5000);
    return () => clearInterval(i);
  }, [fetchActivity]);

  const toggleActivity = () => {
    const next = !activityOpen;
    setActivityOpen(next);
    localStorage.setItem("mc-activity-open", String(next));
    if (next) setSelectedTask(null);
  };

  const handleFilterChange = (f: DateFilter) => {
    setDateFilter(f);
    localStorage.setItem("mc-kanban-filter", f);
  };

  const handleRangeChange = (from: string, to: string) => {
    setRangeFrom(from);
    setRangeTo(to);
    localStorage.setItem("mc-kanban-range-from", from);
    localStorage.setItem("mc-kanban-range-to", to);
  };

  const filteredTasks = tasks.filter((t) => passesDateFilter(t, dateFilter, rangeFrom, rangeTo));

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/mc-tasks");
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const syncGSD = () => fetch("/api/gsd-sync", { method: "POST" }).then(() => fetchTasks()).catch(() => {});
    syncGSD();
    const gsdInterval = setInterval(syncGSD, 5 * 60 * 1000);
    return () => clearInterval(gsdInterval);
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
    fetch("/api/agents").then((r) => r.ok ? r.json() : []).then(setAgents).catch(() => {});
    const i = setInterval(fetchTasks, 10000);
    return () => clearInterval(i);
  }, [fetchTasks]);

  const moveTask = async (id: string, column: ColumnKey) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, column } : t));
    setSelectedTask((prev) => prev?.id === id ? { ...prev, column } : prev);
    const res = await fetch(`/api/mc-tasks/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column, actor: "angel" }),
    });
    if (!res.ok) await fetchTasks();
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

  const approveTask = async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, column: "done" as ColumnKey } : t));
    await fetch(`/api/mc-tasks/${id}/review`, { method: "POST" });
  };

  const rejectTask = async (id: string, feedback: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, column: "done" as ColumnKey } : t));
    await fetch(`/api/mc-tasks/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    await fetchTasks();
  };

  const handleDrop = (column: ColumnKey) => {
    if (draggedTaskId) {
      const task = tasks.find((t) => t.id === draggedTaskId);
      const dragMoves: Record<ColumnKey, ColumnKey[]> = {
        backlog: ["queue"],
        queue: ["backlog"],
        working: [],
        review: ["done", "working"],
        done: [],
      };
      if (task && task.column !== column && dragMoves[task.column]?.includes(column)) {
        moveTask(draggedTaskId, column);
      }
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Task Board
          </h2>
          <div style={{ display: "flex", gap: 4, background: "#0a0a0a", borderRadius: 8, padding: 3, border: "1px solid #1a1a1a" }}>
            {DATE_FILTERS.map((f) => (
              <button key={f.key} onClick={() => handleFilterChange(f.key)}
                style={{
                  background: dateFilter === f.key ? "#00c691" : "transparent",
                  color: dateFilter === f.key ? "#0a0a0a" : "#666",
                  border: "none", borderRadius: 6, padding: "4px 12px",
                  fontSize: 12, fontWeight: dateFilter === f.key ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 150ms ease",
                }}>
                {f.label}
              </button>
            ))}
          </div>
          {dateFilter === "range" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="date" value={rangeFrom} onChange={(e) => handleRangeChange(e.target.value, rangeTo)}
                style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: "4px 8px", color: "#ccc", fontSize: 12, fontFamily: "inherit", outline: "none", colorScheme: "dark" }} />
              <span style={{ color: "#555", fontSize: 11 }}>—</span>
              <input type="date" value={rangeTo} onChange={(e) => handleRangeChange(rangeFrom, e.target.value)}
                style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: "4px 8px", color: "#ccc", fontSize: 12, fontFamily: "inherit", outline: "none", colorScheme: "dark" }} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleActivity} style={{ background: activityOpen ? "#1a2a3a" : "transparent", color: activityOpen ? "#38bdf8" : "#888", border: `1px solid ${activityOpen ? "#38bdf8" : "#2a2a2a"}`, borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 150ms ease" }}>
            {"\uD83D\uDCE1"} Actividad
          </button>
          <button onClick={() => setShowModal(true)} style={{ background: "#00c691", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + Nueva Tarea
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "start" }}>
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.column === col.key);
          const isDragOver = dragOverColumn === col.key && draggedTaskId !== null;
          return (
            <div key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "8px 10px", background: "#0f0f0f", borderRadius: 6, border: "1px solid #1a1a1a" }}>
                <span>{col.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#888", flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: 10, color: "#444", background: "#1a1a1a", borderRadius: 10, padding: "1px 6px" }}>{colTasks.length}</span>
              </div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 8, minHeight: 100,
                borderRadius: 8, padding: isDragOver ? 4 : 0,
                border: isDragOver ? `2px dashed ${col.color}` : "2px dashed transparent",
                background: isDragOver ? `${col.color}10` : "transparent",
                transition: "all 150ms ease",
              }}>
                {colTasks.length === 0 ? (
                  <div style={{ border: "1px dashed #1a1a1a", borderRadius: 8, padding: 24, textAlign: "center", color: "#333", fontSize: 11 }}>Sin tareas</div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} color={col.color} columnKey={col.key}
                      onClick={() => setSelectedTask(task)}
                      onAssign={() => assignTask(task.id)}
                      onApprove={() => approveTask(task.id)}
                      onReject={() => setRejectTaskId(task.id)}
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => { setDraggedTaskId(null); setDragOverColumn(null); }}
                      isDragging={draggedTaskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && !activityOpen && (
        <DetailPanel task={selectedTask} allTasks={tasks} columns={COLUMNS} onMove={moveTask} onDelete={deleteTask} onAssign={assignTask} onClose={() => setSelectedTask(null)} onRefresh={fetchTasks}
          onCreateFromComment={async (comment) => {
            await fetch("/api/mc-tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Derivada: " + comment.text.slice(0, 50),
                description: comment.text + "\n\n---\nDerivada del comentario de " + comment.by,
                parentId: selectedTask.id,
                column: "backlog",
                source: "kanban",
              }),
            });
            await fetchTasks();
          }}
        />
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

      {rejectTaskId && (
        <RejectModal onSubmit={async (feedback) => {
          await rejectTask(rejectTaskId, feedback);
          setRejectTaskId(null);
        }} onClose={() => setRejectTaskId(null)} />
      )}

      {activityOpen && (
        <ActivityPanel
          events={activityEvents}
          onClose={() => { setActivityOpen(false); localStorage.setItem("mc-activity-open", "false"); }}
          onSelectTask={(taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              setActivityOpen(false);
              localStorage.setItem("mc-activity-open", "false");
              setSelectedTask(task);
            }
          }}
        />
      )}
    </Shell>
  );
}

function TaskCard({ task, color, columnKey, onClick, onAssign, onApprove, onReject, onDragStart, onDragEnd, isDragging }: {
  task: Task; color: string; columnKey: ColumnKey; onClick: () => void; onAssign: () => void;
  onApprove: () => void; onReject: () => void;
  onDragStart: () => void; onDragEnd: () => void; isDragging: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const agentEmoji = task.agentKey ? (task.agentKey === "K" ? "👾" : "🤖") : "";
  const typeEmoji: Record<string, string> = { request: "📩", improvement: "✨", bug: "🐛", idea: "💡" };

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#161616" : "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 8, padding: 12,
        borderLeft: `3px solid ${color}`,
        cursor: "grab", transition: "all 150ms ease",
        position: "relative",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {task.parentId && (
        <span style={{ fontSize: 9, color: "#a78bfa", background: "#1a1a2a", padding: "1px 5px", borderRadius: 3, border: "1px solid #2a2a3a", marginBottom: 4, display: "inline-block" }}>↩ subtask</span>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>{task.taskType && <span style={{ marginRight: 4 }}>{typeEmoji[task.taskType]}</span>}{task.title}</div>
      {task.agentKey && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span>{agentEmoji}</span><span>{task.agentKey}</span>
        </div>
      )}
      {task.description && (
        <p style={{ fontSize: 11, color: "#666", margin: "0 0 6px 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</p>
      )}
      {task.comments && task.comments.length > 0 && (
        <p style={{ fontSize: 10, color: "#555", margin: "0 0 6px 0", lineHeight: 1.3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          💬 {task.comments[task.comments.length - 1].text}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#444" }}>{formatRelativeTime(task.updatedAt)}</span>
        {columnKey === "queue" && (
          <button onClick={(e) => { e.stopPropagation(); onAssign(); }}
            style={{ background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 4, padding: "2px 8px", color: "#00c691", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            ▶️ Go
          </button>
        )}
        {columnKey === "review" && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={(e) => { e.stopPropagation(); onApprove(); }}
              style={{ background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 4, padding: "2px 8px", color: "#00c691", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
              title="Approve">
              ✅
            </button>
            <button onClick={(e) => { e.stopPropagation(); onReject(); }}
              style={{ background: "#2a1a1a", border: "1px solid #3a2a2a", borderRadius: 4, padding: "2px 8px", color: "#f59e0b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
              title="Request Changes">
              🔄
            </button>
          </div>
        )}
      </div>
      {(() => {
        const badge = SOURCE_BADGES[task.source];
        if (!badge) return null;
        return (
          <span style={{ position: "absolute", top: 6, right: 8, fontSize: 9, color: badge.color, background: badge.bg, padding: "1px 6px", borderRadius: 3, border: `1px solid ${badge.color}33` }}>
            {badge.emoji} {badge.label}
          </span>
        );
      })()}
    </div>
  );
}

function RejectModal({ onSubmit, onClose }: { onSubmit: (feedback: string) => Promise<void>; onClose: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    await onSubmit(feedback.trim());
    setSending(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, width: 380, maxWidth: "90vw" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#ededed", margin: "0 0 16px 0" }}>🔄 Request Changes</h3>
          <textarea
            value={feedback} onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what needs to change..."
            rows={4} autoFocus
            style={{ width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 12px", color: "#e8e8e8", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 16px", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={submit} disabled={!feedback.trim() || sending}
              style={{ background: feedback.trim() ? "#f59e0b" : "#2a2a1a", color: feedback.trim() ? "#0a0a0a" : "#555", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: feedback.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
              {sending ? "Enviando..." : "Enviar Feedback"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailPanel({ task, allTasks, columns, onMove, onDelete, onAssign, onClose, onRefresh, onCreateFromComment }: {
  task: Task; allTasks: Task[]; columns: ColumnDef[]; onMove: (id: string, col: ColumnKey) => void; onDelete: (id: string) => void; onAssign: (id: string) => void; onClose: () => void; onRefresh: () => void;
  onCreateFromComment: (comment: { text: string; by: string; at: string }) => void;
}) {
  const current = columns.find((c) => c.key === task.column)!;
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);
  const [attName, setAttName] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [addingAtt, setAddingAtt] = useState(false);
  const [showAttForm, setShowAttForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const subtasks = allTasks.filter((t) => t.parentId === task.id);

  const addAttachment = async () => {
    if (!attName.trim() || !attUrl.trim()) return;
    setAddingAtt(true);
    await fetch(`/api/mc-tasks/${task.id}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: attName.trim(), url: attUrl.trim(), addedBy: "angel" }),
    });
    setAttName("");
    setAttUrl("");
    setShowAttForm(false);
    setAddingAtt(false);
    onRefresh();
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    await fetch(`/api/mc-tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText.trim(), by: "Angel" }),
    });
    setCommentText("");
    setAddingComment(false);
    onRefresh();
  };

  const createSubtask = async () => {
    if (!subtaskTitle.trim()) return;
    setCreatingSub(true);
    await fetch("/api/mc-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subtaskTitle.trim(),
        description: "",
        agentId: task.agentId,
        agentKey: task.agentKey,
        column: "backlog",
        source: "kanban",
        parentId: task.id,
      }),
    });
    setSubtaskTitle("");
    setShowSubtaskForm(false);
    setCreatingSub(false);
    onRefresh();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, background: "#111", borderLeft: "1px solid #2a2a2a", zIndex: 901, display: "flex", flexDirection: "column", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: current.color, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{current.icon} {current.label}</span>
            {task.parentId && <span style={{ fontSize: 9, color: "#a78bfa", background: "#1a1a2a", padding: "1px 5px", borderRadius: 3 }}>↩ subtask</span>}
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
              {(() => {
                const angelMoves: Record<ColumnKey, ColumnKey[]> = {
                  backlog: ["queue"],
                  queue: ["backlog"],
                  working: [],
                  review: ["done", "working"],
                  done: [],
                };
                const allowed = angelMoves[task.column] || [];
                return columns.filter((c) => allowed.includes(c.key)).map((c) => (
                  <button key={c.key} onClick={() => onMove(task.id, c.key)}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 6, padding: "8px 12px", color: "#ccc", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    <span>{c.icon}</span><span>{c.label}</span>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Sub-tasks section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sub-tasks</div>
              <button onClick={() => setShowSubtaskForm(true)}
                style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 4, padding: "2px 8px", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                ＋ Sub-task
              </button>
            </div>
            {showSubtaskForm && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input type="text" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Sub-task title" autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") createSubtask(); if (e.key === "Escape") setShowSubtaskForm(false); }}
                  style={{ flex: 1, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 4, padding: "6px 8px", color: "#e8e8e8", fontSize: 12, fontFamily: "inherit", outline: "none" }}
                />
                <button onClick={createSubtask} disabled={!subtaskTitle.trim() || creatingSub}
                  style={{ background: "#00c691", color: "#0a0a0a", border: "none", borderRadius: 4, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Add
                </button>
              </div>
            )}
            {subtasks.length === 0 && !showSubtaskForm ? (
              <div style={{ fontSize: 11, color: "#333", padding: 8 }}>No sub-tasks</div>
            ) : (
              subtasks.map((st) => {
                const stCol = columns.find((c) => c.key === st.column);
                return (
                  <div key={st.id} style={{ fontSize: 12, color: "#999", marginBottom: 4, padding: "6px 8px", background: "#0f0f0f", borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: stCol?.color || "#555", display: "inline-block", flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{st.title}</span>
                    <span style={{ fontSize: 9, color: "#555" }}>{stCol?.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Attachments section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Attachments</div>
              <button onClick={() => setShowAttForm(true)}
                style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 4, padding: "2px 8px", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                ＋ Adjunto
              </button>
            </div>
            {showAttForm && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, padding: 8, background: "#0a0a0a", borderRadius: 6, border: "1px solid #1a1a1a" }}>
                <input type="text" value={attName} onChange={(e) => setAttName(e.target.value)} placeholder="Nombre" autoFocus
                  style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "6px 8px", color: "#e8e8e8", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <input type="text" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="URL"
                  onKeyDown={(e) => { if (e.key === "Enter") addAttachment(); if (e.key === "Escape") setShowAttForm(false); }}
                  style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "6px 8px", color: "#e8e8e8", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAttForm(false)} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 4, padding: "4px 10px", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                  <button onClick={addAttachment} disabled={!attName.trim() || !attUrl.trim() || addingAtt}
                    style={{ background: "#00c691", color: "#0a0a0a", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Agregar
                  </button>
                </div>
              </div>
            )}
            {(!task.attachments || task.attachments.length === 0) && !showAttForm ? (
              <div style={{ fontSize: 11, color: "#333", padding: 8 }}>Sin adjuntos</div>
            ) : (
              (task.attachments || []).map((att, i) => (
                <div key={i} style={{ fontSize: 12, color: "#999", marginBottom: 4, padding: "6px 8px", background: "#0f0f0f", borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>📎</span>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: "#00c691", textDecoration: "none", flex: 1, fontSize: 12 }}>{att.name}</a>
                  <span style={{ fontSize: 9, color: "#555" }}>{att.addedBy} · {formatRelativeTime(att.addedAt)}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", marginBottom: 8 }}>Comentarios</div>
            {task.comments.length === 0 && (
              <div style={{ fontSize: 11, color: "#333", padding: 8 }}>Sin comentarios</div>
            )}
            {task.comments.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: "#999", marginBottom: 6, padding: "6px 8px", background: "#0f0f0f", borderRadius: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>{c.by} · {formatRelativeTime(c.at)}</span>
                  <button onClick={() => onCreateFromComment(c)} title="Crear tarea desde esto"
                    style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 3, padding: "1px 5px", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 }}>
                    📋
                  </button>
                </div>
                <p style={{ margin: "4px 0 0 0" }}>{c.text}</p>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                style={{ flex: 1, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 4, padding: "6px 8px", color: "#e8e8e8", fontSize: 12, fontFamily: "inherit", outline: "none" }}
              />
              <button onClick={addComment} disabled={!commentText.trim() || addingComment}
                style={{ background: commentText.trim() ? "#00c691" : "#1a3a2a", color: commentText.trim() ? "#0a0a0a" : "#555", border: "none", borderRadius: 4, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: commentText.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                Enviar
              </button>
            </div>
          </div>
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

function ActivityPanel({ events, onClose, onSelectTask }: {
  events: ActivityEvent[];
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 340, background: "#111", borderLeft: "1px solid #2a2a2a", zIndex: 901, display: "flex", flexDirection: "column", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>{"\uD83D\uDCE1"} Actividad en tiempo real</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {events.length === 0 ? (
            <div style={{ textAlign: "center", color: "#333", fontSize: 12, padding: 32 }}>Sin actividad reciente</div>
          ) : (
            events.map((ev) => {
              const borderColor = EVENT_TYPE_COLORS[ev.type] || "#555";
              const emoji = AGENT_EMOJI_MAP[ev.agent] || "\uD83E\uDD16";
              return (
                <div key={ev.id} style={{
                  padding: "10px 12px", marginBottom: 6, background: "#0f0f0f", borderRadius: 6,
                  borderLeft: `3px solid ${borderColor}`, cursor: "pointer",
                }} onClick={() => onSelectTask(ev.taskId)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#ccc" }}>{ev.agent}</span>
                    <span style={{ fontSize: 11, color: "#888" }}>{ev.detail}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                    {ev.taskTitle}
                  </div>
                  <div style={{ fontSize: 10, color: "#444" }}>{formatRelativeTime(ev.timestamp)}</div>
                </div>
              );
            })
          )}
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
  const [taskType, setTaskType] = useState<"request" | "improvement" | "bug" | "idea">("request");
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
      column: "backlog",
      source: "kanban",
      taskType,
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
                  style={{
                    background: enhancing ? "rgba(124,138,255,0.1)" : "none",
                    border: `1px solid ${enhancing ? "#7c8aff" : "#2a2a3a"}`,
                    borderRadius: 4, padding: "3px 10px",
                    color: enhancing ? "#7c8aff" : desc.trim() ? "#7c8aff" : "#555",
                    fontSize: 11, cursor: enhancing ? "default" : "pointer", fontFamily: "inherit",
                    transition: "all 0.3s ease",
                    animation: enhancing ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}>
                  {enhancing ? "✨ Mejorando con IA..." : "✨ Mejorar con IA"}
                </button>
              </div>
              {enhancing && (
                <div style={{ fontSize: 11, color: "#7c8aff", marginBottom: 6, fontStyle: "italic", animation: "pulse 1.5s ease-in-out infinite" }}>
                  Estamos mejorando con IA la tarea...
                </div>
              )}
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalles de la tarea…" rows={5}
                disabled={enhancing}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120, opacity: enhancing ? 0.5 : 1, transition: "opacity 0.3s ease" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Agente</label>
              <select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Sin asignar</option>
                {agents.map((a) => <option key={a.key} value={a.key}>{a.emoji} {a.key} — {a.role}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Tipo</label>
              <select value={taskType} onChange={(e) => setTaskType(e.target.value as "request" | "improvement" | "bug" | "idea")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="request">📩 Nueva solicitud</option>
                <option value="improvement">✨ Mejora</option>
                <option value="bug">🐛 Bug</option>
                <option value="idea">💡 Idea</option>
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
