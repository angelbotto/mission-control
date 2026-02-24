import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { loadTasks, saveTasks } from "../../route";
import { appendActivity } from "../../activity/route";

function triggerDispatcher(task: { id: string; title: string; agentId?: string; agentKey?: string }) {
  const agent = task.agentKey || task.agentId || "K";
  const text = `📋 Tarea en Working: "${task.title}" (asignada a ${agent}, id: ${task.id}). Ejecuta inmediatamente.`;
  exec(`openclaw system event --text ${JSON.stringify(text)} --mode now`, (err) => {
    if (err) console.error("[mc-reject] trigger error:", err.message);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { feedback } = await req.json();

  if (!feedback) {
    return NextResponse.json({ error: "feedback required" }, { status: 400 });
  }

  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date().toISOString();

  // Create new task in working with feedback
  const newTask = {
    id: randomUUID(),
    title: "🔄 " + task.title,
    description: task.description + "\n\n---\nFeedback: " + feedback,
    agentId: task.agentId,
    agentKey: task.agentKey,
    column: "working" as const,
    createdAt: now,
    updatedAt: now,
    createdBy: "angel",
    comments: [],
    source: "review" as const,
    parentId: task.id,
  };
  store.tasks.push(newTask);

  // Move original to done with rejection comment
  task.column = "done";
  task.updatedAt = now;
  task.comments.push({ text: `Rejected — feedback: ${feedback}`, by: "angel", at: now });

  await saveTasks(store);

  appendActivity({ type: "subtask", taskId: newTask.id, taskTitle: newTask.title, agent: task.agentKey || "Sistema", detail: "tarea derivada creada" }).catch(() => {});

  // Trigger dispatcher for the new task
  triggerDispatcher(newTask);

  return NextResponse.json({ ok: true, originalTask: task, newTask });
}
