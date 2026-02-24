import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { exec } from "child_process";

function triggerDispatcher(task: { id: string; title: string; agentId?: string; agentKey?: string }) {
  const agent = task.agentKey || task.agentId || "K";
  const text = `📋 Tarea en Working: "${task.title}" (asignada a ${agent}, id: ${task.id}). Ejecuta inmediatamente.`;
  exec(`openclaw system event --text ${JSON.stringify(text)} --mode now`, (err) => {
    if (err) console.error("[mc-tasks] trigger error:", err.message);
  });
}

export interface McTask {
  id: string;
  title: string;
  description: string;
  agentId: string;
  agentKey: string;
  column: "backlog" | "queue" | "working" | "review" | "done";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  comments: Array<{ text: string; by: string; at: string }>;
  source: string;
  parentId?: string;
  attachments?: Array<{ name: string; url: string; addedBy: string; addedAt: string }>;
}

interface TaskStore {
  tasks: McTask[];
}

const TASKS_FILE = join(
  process.env.WORKSPACE_DIR || "/Users/angelbotto/.openclaw/workspace",
  "mc-tasks.json"
);

export async function loadTasks(): Promise<TaskStore> {
  try {
    const raw = await readFile(TASKS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { tasks: [] };
  }
}

export async function saveTasks(store: TaskStore): Promise<void> {
  await writeFile(TASKS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  const store = await loadTasks();
  const parentId = req.nextUrl.searchParams.get("parentId");
  const tasks = parentId
    ? store.tasks.filter((t) => t.parentId === parentId)
    : store.tasks;
  return NextResponse.json(tasks, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, agentId, agentKey, column, source, parentId, attachments } = body;

    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const task: McTask = {
      id: randomUUID(),
      title,
      description: description || "",
      agentId: agentId || "",
      agentKey: agentKey || "",
      column: column || "backlog",
      createdAt: now,
      updatedAt: now,
      createdBy: "angel",
      comments: [],
      source: source || "kanban",
      ...(parentId ? { parentId } : {}),
      ...(attachments ? { attachments } : {}),
    };

    const store = await loadTasks();
    store.tasks.push(task);
    await saveTasks(store);

    // Trigger inmediato si la tarea nace directamente en "working"
    if (task.column === "working") {
      triggerDispatcher(task);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
