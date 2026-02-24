"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

function Md({ children, compact }: { children: string; compact?: boolean }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 style={{ fontSize: compact ? 14 : 18, fontWeight: 700, color: "#ededed", margin: "12px 0 6px" }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize: compact ? 13 : 16, fontWeight: 600, color: "#ededed", margin: "10px 0 4px" }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: compact ? 12 : 14, fontWeight: 600, color: "#ddd", margin: "8px 0 4px" }}>{children}</h3>,
        p: ({ children }) => <p style={{ margin: "0 0 8px", lineHeight: 1.6, fontSize: compact ? 12 : 13, color: compact ? "#999" : "#bbb" }}>{children}</p>,
        strong: ({ children }) => <strong style={{ color: "#ededed", fontWeight: 600 }}>{children}</strong>,
        em: ({ children }) => <em style={{ color: "#aaa" }}>{children}</em>,
        ul: ({ children }) => <ul style={{ margin: "4px 0 8px 16px", listStyleType: "disc" }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "4px 0 8px 16px", listStyleType: "decimal" }}>{children}</ol>,
        li: ({ children }) => <li style={{ fontSize: compact ? 12 : 13, color: "#bbb", marginBottom: 2 }}>{children}</li>,
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <pre style={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 6, padding: "10px 14px", overflow: "auto", margin: "8px 0" }}>
              <code style={{ fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" }}>{children}</code>
            </pre>
          ) : (
            <code style={{ fontFamily: "monospace", fontSize: "0.9em", background: "#1a1a1a", padding: "1px 5px", borderRadius: 3, color: "#00c691" }}>{children}</code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener" style={{ color: "#38bdf8", textDecoration: "underline" }}>{children}</a>,
        blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #2a2a2a", paddingLeft: 12, margin: "8px 0", color: "#888" }}>{children}</blockquote>,
        hr: () => <hr style={{ border: "none", borderTop: "1px solid #1f1f1f", margin: "12px 0" }} />,
      }}
    >{children}</ReactMarkdown>
  );
}

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

const AGENT_AVATAR_MAP: Record<string, string> = {
  K: "/avatars/k_final_v4.png",
  Arq: "/avatars/arq_fal_v2.png",
  Vera: "/avatars/vera_avatar_final.png",
  Nexo: "/avatars/nexo_fal_v2.png",
  Pluma: "/avatars/pluma_fal_v3.png",
  "Oráculo": "/avatars/oraculo_fal_v2.png",
  Vault: "/avatars/vault.png",
  Iris: "/avatars/iris.png",
};

const AGENT_COLORS: Record<string, string> = {
  K: "#00c691",
  Arq: "#38bdf8",
  Vera: "#f59e0b",
  Nexo: "#6366f1",
  Pluma: "#a78bfa",
  "Oráculo": "#ec4899",
  Vault: "#10b981",
  Iris: "#f97316",
  Angel: "#ededed",
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
  progress?: number;
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

function toCOT(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // YYYY-MM-DD
}

function passesDateFilter(task: Task, filter: DateFilter, rangeFrom?: string, rangeTo?: string): boolean {
  if (filter === "all") return true;
  if (task.column === "working") return true;

  const now = new Date();
  const todayCOT = toCOT(now);
  const createdCOT = toCOT(new Date(task.createdAt));
  const updatedCOT = toCOT(new Date(task.updatedAt));

  if (filter === "today") {
    return createdCOT === todayCOT || updatedCOT === todayCOT;
  }
  if (filter === "week") {
    const nowCOT = new Date(todayCOT + "T12:00:00");
    const day = nowCOT.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(nowCOT);
    startOfWeek.setDate(nowCOT.getDate() - diff);
    const startStr = startOfWeek.toISOString().slice(0, 10);
    return (createdCOT >= startStr && createdCOT <= todayCOT) || (updatedCOT >= startStr && updatedCOT <= todayCOT);
  }
  if (filter === "range") {
    if (!rangeFrom && !rangeTo) return true;
    const from = rangeFrom || "1970-01-01";
    const to = rangeTo || "2099-12-31";
    return (createdCOT >= from && createdCOT <= to) || (updatedCOT >= from && updatedCOT <= to);
  }
  // month
  const monthStart = todayCOT.slice(0, 7) + "-01";
  return (createdCOT >= monthStart && createdCOT <= todayCOT) || (updatedCOT >= monthStart && updatedCOT <= todayCOT);
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
  const [groupByAgent, setGroupByAgent] = useState(false);

  useEffect(() => {
    setDateFilter(getStoredFilter());
    setRangeFrom(localStorage.getItem("mc-kanban-range-from") || "");
    setRangeTo(localStorage.getItem("mc-kanban-range-to") || "");
    setActivityOpen(localStorage.getItem("mc-activity-open") === "true");
    setGroupByAgent(localStorage.getItem("mc-group-by-agent") === "true");
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
          <button onClick={() => { const next = !groupByAgent; setGroupByAgent(next); localStorage.setItem("mc-group-by-agent", String(next)); }}
            style={{ background: groupByAgent ? "#1a2a1a" : "transparent", color: groupByAgent ? "#00c691" : "#888", border: `1px solid ${groupByAgent ? "#00c691" : "#2a2a2a"}`, borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 150ms ease" }}>
            👤 Por agente
          </button>
          <button onClick={toggleActivity} style={{ background: activityOpen ? "#1a2a3a" : "transparent", color: activityOpen ? "#38bdf8" : "#888", border: `1px solid ${activityOpen ? "#38bdf8" : "#2a2a2a"}`, borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 150ms ease" }}>
            {"\uD83D\uDCE1"} Actividad
          </button>
          <button onClick={() => setShowModal(true)} style={{ background: "#00c691", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + Nueva Tarea
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(180px, 1fr))", gap: 8, alignItems: "start", overflowX: "auto", paddingBottom: 8 }}>
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.column === col.key);
          const isDragOver = dragOverColumn === col.key && draggedTaskId !== null;
          return (
            <div key={col.key} style={{ minWidth: 0 }}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "6px 10px", background: "#0f0f0f", borderRadius: 6, border: "1px solid #1a1a1a", position: "sticky", top: 0, zIndex: 1 }}>
                <span style={{ fontSize: 11 }}>{col.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#888", flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: 10, color: col.color, background: `${col.color}18`, borderRadius: 10, padding: "1px 7px", fontWeight: 600 }}>{colTasks.length}</span>
              </div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 4, minHeight: 80,
                borderRadius: 6, padding: isDragOver ? 4 : 2,
                border: isDragOver ? `2px dashed ${col.color}` : "2px dashed transparent",
                background: isDragOver ? `${col.color}08` : "transparent",
                transition: "all 150ms ease",
              }}>
                {colTasks.length === 0 ? (
                  <div style={{ borderRadius: 6, padding: "20px 12px", textAlign: "center", color: "#2a2a2a", fontSize: 11 }}>vacío</div>
                ) : groupByAgent ? (() => {
                  // Group tasks by agentKey
                  const groups: Record<string, Task[]> = {};
                  colTasks.forEach((t) => {
                    const key = t.agentKey || "—";
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(t);
                  });
                  return Object.entries(groups).map(([agentKey, agentTasks]) => {
                    const agentColor = AGENT_COLORS[agentKey] || "#555";
                    const agentAvatar = AGENT_AVATAR_MAP[agentKey];
                    const agentEmoji = AGENT_EMOJI_MAP[agentKey] || "🤖";
                    return (
                      <div key={agentKey} style={{ marginBottom: 6 }}>
                        {/* Agent group header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, background: "#0f0f0f", borderRadius: 6, border: `1px solid ${agentColor}28` }}>
                          {agentAvatar ? (
                            <img src={agentAvatar} alt={agentKey}
                              style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${agentColor}`, flexShrink: 0 }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{agentEmoji}</span>
                          )}
                          <span style={{ fontSize: 13, fontWeight: 700, color: agentColor, letterSpacing: "0.02em" }}>{agentKey}</span>
                          <span style={{ fontSize: 10, marginLeft: "auto", background: `${agentColor}18`, color: agentColor, borderRadius: 10, padding: "1px 7px", fontWeight: 600 }}>{agentTasks.length}</span>
                        </div>
                        {agentTasks.map((task) => (
                          <TaskCard key={task.id} task={task} color={col.color} columnKey={col.key}
                            onClick={() => setSelectedTask(task)}
                            onAssign={() => assignTask(task.id)}
                            onApprove={() => approveTask(task.id)}
                            onReject={() => setRejectTaskId(task.id)}
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => { setDraggedTaskId(null); setDragOverColumn(null); }}
                            isDragging={draggedTaskId === task.id}
                          />
                        ))}
                      </div>
                    );
                  });
                })() : (
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
        <NewTaskModal agents={agents} tasks={tasks} onSubmit={async (data) => {
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

function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function TaskCard({ task, color, columnKey, onClick, onAssign, onDragStart, onDragEnd, isDragging }: {
  task: Task; color: string; columnKey: ColumnKey; onClick: () => void; onAssign: () => void;
  onApprove: () => void; onReject: () => void;
  onDragStart: () => void; onDragEnd: () => void; isDragging: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const typeEmoji: Record<string, string> = { request: "📩", improvement: "✨", bug: "🐛", idea: "💡" };
  const badge = SOURCE_BADGES[task.source];

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
        border: `1px solid ${hovered ? "#252525" : "#1a1a1a"}`,
        borderRadius: 6,
        padding: "8px 10px",
        borderLeft: `2px solid ${color}`,
        cursor: "pointer",
        transition: "background 100ms ease, border-color 100ms ease",
        opacity: isDragging ? 0.35 : 1,
        userSelect: "none",
      }}
    >
      {/* Title — single most important element */}
      <div style={{
        fontSize: 12, fontWeight: 500, color: "#d8d8d8", lineHeight: 1.45,
        marginBottom: 6,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden", wordBreak: "break-word",
      }}>
        {task.taskType && <span style={{ marginRight: 3, opacity: 0.7 }}>{typeEmoji[task.taskType]}</span>}
        {task.parentId && <span style={{ marginRight: 3, fontSize: 10, color: "#a78bfa" }}>↩</span>}
        {task.title}
      </div>

      {/* Footer: badges + time */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap", minWidth: 0 }}>
        {task.agentKey && (
          <span style={{ fontSize: 9, color: "#555", background: "#181818", border: "1px solid #222", borderRadius: 3, padding: "1px 4px", flexShrink: 0 }}>
            {task.agentKey}
          </span>
        )}
        {badge && (
          <span style={{ fontSize: 9, color: badge.color, flexShrink: 0 }}>{badge.emoji}</span>
        )}
        {task.comments && task.comments.length > 0 && (
          <span style={{ fontSize: 9, color: "#383838", flexShrink: 0 }}>💬{task.comments.length}</span>
        )}
        <span style={{ fontSize: 9, color: "#2e2e2e", marginLeft: "auto", flexShrink: 0 }}>
          {formatRelativeTime(task.updatedAt)}
        </span>
        {(columnKey === "backlog" || columnKey === "queue") && (
          <button onClick={(e) => { e.stopPropagation(); onAssign(); }}
            style={{ background: "transparent", border: "none", color: "#00c691", fontSize: 11, cursor: "pointer", padding: "0 2px", flexShrink: 0, lineHeight: 1 }}>
            ⏩
          </button>
        )}
      </div>
      {columnKey === "working" && task.progress != null && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: "#00c691", fontWeight: 600 }}>{task.progress}%</span>
          </div>
          <div style={{ height: 3, background: "#1f1f1f", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${task.progress}%`, background: "#00c691", borderRadius: 2, transition: "width 300ms ease" }} />
          </div>
        </div>
      )}
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
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [enhancingReview, setEnhancingReview] = useState(false);
  const subtasks = allTasks.filter((t) => t.parentId === task.id);

  const updateProgress = async (value: number) => {
    setUpdatingProgress(true);
    await fetch(`/api/mc-tasks/${task.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: Math.min(100, Math.max(0, value)) }),
    });
    setUpdatingProgress(false);
    onRefresh();
  };

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
          {task.agentKey && <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>{AGENT_EMOJI_MAP[task.agentKey] || ""} {task.agentKey}</div>}
          {task.column === "review" && (
            <div style={{ marginBottom: 16, padding: 14, background: "#0f1a0f", border: "1px solid #2a3a2a", borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#00c691", marginBottom: 8 }}>📊 Resumen Ejecutivo</div>
              {task.agentKey && (
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>
                  Agente: {AGENT_EMOJI_MAP[task.agentKey] || "🤖"} <strong style={{ color: "#ededed" }}>{task.agentKey}</strong>
                </div>
              )}
              {task.comments.length > 0 ? (
                <div style={{ fontSize: 12, color: "#bbb" }}>
                  <Md compact>{task.comments[task.comments.length - 1].text}</Md>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#555", fontStyle: "italic" }}>Sin resumen disponible</div>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2a3a2a" }}>
                  {task.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-block", fontSize: 11, color: "#00c691", marginRight: 10, textDecoration: "none" }}>
                      📎 {att.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {task.column === "working" && (() => {
            const feedbackComment = [...task.comments].reverse().find(c => c.text.includes("Cambios solicitados"));
            if (!feedbackComment) return null;
            return (
              <div style={{ marginBottom: 16, padding: 12, background: "#2a1a0a", border: "1px solid #5a3a1a", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>⚠️ FEEDBACK DE REVISIÓN</div>
                <Md compact>{feedbackComment.text}</Md>
                <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>{feedbackComment.by} · {formatRelativeTime(feedbackComment.at)}</div>
              </div>
            );
          })()}
          {task.column === "working" && (
            <div style={{ marginBottom: 16, padding: 12, background: "#0f0f1a", border: "1px solid #1a2a3a", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600 }}>Progreso</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#00c691" }}>{task.progress ?? 0}%</span>
              </div>
              <div style={{ height: 6, background: "#1f1f1f", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${task.progress ?? 0}%`, background: "#00c691", borderRadius: 3, transition: "width 300ms ease" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => updateProgress((task.progress ?? 0) + 10)} disabled={updatingProgress}
                  style={{ flex: 1, background: "#1a2a1a", border: "1px solid #2a3a2a", borderRadius: 4, padding: "5px 0", color: "#00c691", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  +10%
                </button>
                <button onClick={() => updateProgress((task.progress ?? 0) + 25)} disabled={updatingProgress}
                  style={{ flex: 1, background: "#1a2a1a", border: "1px solid #2a3a2a", borderRadius: 4, padding: "5px 0", color: "#00c691", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  +25%
                </button>
                <button onClick={() => updateProgress(100)} disabled={updatingProgress}
                  style={{ flex: 1, background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 4, padding: "5px 0", color: "#00c691", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  100%
                </button>
              </div>
            </div>
          )}
          {task.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descripción</div>
              <Md>{task.description}</Md>
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Creada</div><div style={{ fontSize: 12, color: "#888" }}>{formatRelativeTime(task.createdAt)}</div></div>
            <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Actualizada</div><div style={{ fontSize: 12, color: "#888" }}>{formatRelativeTime(task.updatedAt)}</div></div>
            <div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Fuente</div><div style={{ fontSize: 12, color: "#888" }}>{task.source}</div></div>
          </div>

          {(task.column === "backlog" || task.column === "queue") && (
            <button onClick={() => onAssign(task.id)}
              style={{ width: "100%", background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 6, padding: "10px", color: "#00c691", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 16 }}>
              ⏩ Priorizar — Asignar y Comenzar
            </button>
          )}

          {task.column === "review" && (
            <div style={{ marginBottom: 20, padding: 16, background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>👀 Revisión</div>
                <button onClick={async () => {
                  if (!reviewFeedback.trim()) return;
                  setEnhancingReview(true);
                  try {
                    const context = allTasks.slice(0, 20).map(t =>
                      `[${t.column}] ${t.title} (${t.agentKey || "sin asignar"})${t.description ? ": " + t.description.slice(0, 100) : ""}`
                    ).join("\n");
                    const res = await fetch("/api/enhance-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reviewFeedback, context }) });
                    if (res.ok) { const { enhanced } = await res.json(); if (enhanced) setReviewFeedback(enhanced); }
                  } finally { setEnhancingReview(false); }
                }} disabled={enhancingReview || !reviewFeedback.trim()}
                  style={{ background: "none", border: `1px solid ${enhancingReview ? "#7c8aff" : "#2a2a3a"}`, borderRadius: 4, padding: "2px 8px", color: enhancingReview ? "#7c8aff" : reviewFeedback.trim() ? "#7c8aff" : "#555", fontSize: 10, cursor: enhancingReview ? "default" : "pointer", fontFamily: "inherit" }}>
                  {enhancingReview ? "✨ Mejorando..." : "✨ Mejorar"}
                </button>
              </div>
              <textarea
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Feedback / Comentario de revisión..."
                rows={3}
                disabled={enhancingReview}
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 12px", color: "#e8e8e8", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box", marginBottom: 10, opacity: enhancingReview ? 0.5 : 1 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  if (reviewFeedback.trim()) {
                    await fetch(`/api/mc-tasks/${task.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "✅ **Aprobado** — " + reviewFeedback, by: "Angel" }) });
                  }
                  await fetch(`/api/mc-tasks/${task.id}/review`, { method: "POST" });
                  setReviewFeedback("");
                  onClose();
                  onRefresh();
                }}
                  style={{ flex: 1, background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 6, padding: "10px", color: "#00c691", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  ✅ Aprobar → Done
                </button>
                <button onClick={async () => {
                  const fb = reviewFeedback.trim() || "Requiere cambios";
                  await fetch(`/api/mc-tasks/${task.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "🔄 **Cambios solicitados** — " + fb, by: "Angel" }) });
                  await onMove(task.id, "working");
                  setReviewFeedback("");
                }}
                  style={{ flex: 1, background: "#2a1a0a", border: "1px solid #5a3a1a", borderRadius: 6, padding: "10px", color: "#f59e0b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  🔄 Pedir cambios
                </button>
              </div>
            </div>
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
            <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 8 }}>💬 Comentarios</div>
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
                <Md compact>{c.text}</Md>
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

function NewTaskModal({ agents, tasks, onSubmit, onClose }: {
  agents: AgentOption[];
  tasks: Task[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [agent, setAgent] = useState("");
  const [taskType, setTaskType] = useState<"request" | "improvement" | "bug" | "idea">("request");
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [descTab, setDescTab] = useState<"write" | "preview">("write");

  const enhance = async () => {
    if (!desc.trim()) return;
    setEnhancing(true);
    try {
      const context = tasks.slice(0, 20).map(t =>
        `[${t.column}] ${t.title} (${t.agentKey || "sin asignar"})${t.description ? ": " + t.description.slice(0, 100) : ""}`
      ).join("\n");
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: desc, context }),
      });
      if (res.ok) {
        const { enhanced } = await res.json();
        if (enhanced) { setDesc(enhanced); setDescTab("preview"); }
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

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 12px", color: "#e8e8e8", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const tabBtn = (key: "write" | "preview") => ({
    background: descTab === key ? "#1a1a1a" : "transparent",
    border: "none",
    borderBottom: descTab === key ? "2px solid #00c691" : "2px solid transparent",
    color: descTab === key ? "#e8e8e8" : "#666",
    fontSize: 12, fontWeight: descTab === key ? 600 : 400,
    padding: "4px 14px", cursor: "pointer", fontFamily: "inherit",
    transition: "all 120ms ease",
  } as React.CSSProperties);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "#111", border: "1px solid #2a2a2a", borderRadius: 12,
          padding: 28, width: 700, maxWidth: "96vw", maxHeight: "92vh",
          display: "flex", flexDirection: "column", gap: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#ededed", margin: 0 }}>✏️ Nueva Tarea</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
            {/* Title */}
            <div>
              <label style={{ fontSize: 11, color: "#888", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>Título</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus style={{ ...inputStyle, fontSize: 15, fontWeight: 500, padding: "10px 14px" }}
                onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) submit(); }} />
            </div>

            {/* Description with tabs */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0, borderBottom: "1px solid #1f1f1f" }}>
                <div style={{ display: "flex" }}>
                  <button style={tabBtn("write")} onClick={() => setDescTab("write")}>✍️ Escribir</button>
                  <button style={tabBtn("preview")} onClick={() => setDescTab("preview")} disabled={!desc.trim()}>👁 Preview</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#444" }}>{desc.length} chars</span>
                  <button onClick={enhance} disabled={enhancing || !desc.trim()}
                    style={{
                      background: enhancing ? "rgba(124,138,255,0.12)" : "none",
                      border: `1px solid ${enhancing ? "#7c8aff" : desc.trim() ? "#2a2a4a" : "#1f1f1f"}`,
                      borderRadius: 5, padding: "3px 11px",
                      color: enhancing ? "#7c8aff" : desc.trim() ? "#7c8aff" : "#444",
                      fontSize: 11, cursor: enhancing || !desc.trim() ? "default" : "pointer",
                      fontFamily: "inherit", transition: "all 0.2s ease",
                    }}>
                    {enhancing ? "✨ Mejorando..." : "✨ Mejorar con IA"}
                  </button>
                </div>
              </div>

              {descTab === "write" ? (
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder={"Descripción en Markdown…\n\n# Título\n- Lista\n**negrita**, _cursiva_, `código`\n\n```js\nconsole.log('hello')\n```"}
                  disabled={enhancing}
                  style={{
                    ...inputStyle, resize: "vertical", minHeight: 240, lineHeight: 1.6,
                    fontSize: 13, fontFamily: "monospace",
                    opacity: enhancing ? 0.5 : 1, transition: "opacity 0.3s ease",
                    borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0,
                  }}
                />
              ) : (
                <div style={{
                  background: "#0a0a0a", border: "1px solid #2a2a2a", borderTop: "none",
                  borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
                  padding: "12px 16px", minHeight: 240, overflowY: "auto",
                }}>
                  {desc.trim() ? <Md>{desc}</Md> : <span style={{ color: "#333", fontSize: 13 }}>Nada que previsualizar aún…</span>}
                </div>
              )}

              {enhancing && (
                <div style={{ fontSize: 11, color: "#7c8aff", marginTop: 6, fontStyle: "italic" }}>
                  ✨ Mejorando descripción con IA…
                </div>
              )}
            </div>

            {/* Agent + Type row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>Agente</label>
                <select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Sin asignar</option>
                  {agents.map((a) => <option key={a.key} value={a.key}>{a.emoji} {a.key} — {a.role}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo</label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value as "request" | "improvement" | "bug" | "idea")} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="request">📩 Nueva solicitud</option>
                  <option value="improvement">✨ Mejora</option>
                  <option value="bug">🐛 Bug</option>
                  <option value="idea">💡 Idea</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid #1a1a1a" }}>
            <span style={{ fontSize: 11, color: "#444" }}>
              {desc.trim() ? `📝 ${desc.trim().split(/\s+/).length} palabras` : "Sin descripción"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 18px", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={submit} disabled={!title.trim() || saving}
                style={{ background: title.trim() ? "#00c691" : "#1a3a2a", color: title.trim() ? "#0a0a0a" : "#555", border: "none", borderRadius: 6, padding: "8px 22px", fontSize: 13, fontWeight: 700, cursor: title.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                {saving ? "Creando…" : "✅ Crear tarea"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
