import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { loadTasks, saveTasks } from "../../route";

function triggerDispatcher(task: { id: string; title: string; agentId?: string; agentKey?: string }) {
  const agent = task.agentKey || task.agentId || "K";
  const text = `📋 Tarea en Working: "${task.title}" (asignada a ${agent}, id: ${task.id}). Ejecuta inmediatamente.`;
  exec(`openclaw system event --text ${JSON.stringify(text)} --mode now`, (err) => {
    if (err) console.error("[mc-move] trigger error:", err.message);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { column } = await req.json();
  const valid = ["backlog", "queue", "working", "review", "done"];
  if (!valid.includes(column)) {
    return NextResponse.json({ error: "invalid column" }, { status: 400 });
  }

  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  task.column = column;
  task.updatedAt = new Date().toISOString();
  await saveTasks(store);

  // Trigger inmediato: cuando una tarea pasa a "working", despertar a K al instante
  if (column === "working") {
    triggerDispatcher(task);
  }

  return NextResponse.json(task);
}
