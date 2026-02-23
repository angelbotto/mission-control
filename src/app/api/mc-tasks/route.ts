import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

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
  source: "kanban" | "chat" | "gsd";
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

export async function GET() {
  const store = await loadTasks();
  return NextResponse.json(store.tasks, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, agentId, agentKey, column, source } = body;

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
    };

    const store = await loadTasks();
    store.tasks.push(task);
    await saveTasks(store);

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
