import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../route";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const store = await loadTasks();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  const task = store.tasks[idx];
  if (body.title !== undefined) task.title = body.title;
  if (body.description !== undefined) task.description = body.description;
  if (body.column !== undefined) task.column = body.column;
  if (body.agentId !== undefined) task.agentId = body.agentId;
  if (body.agentKey !== undefined) task.agentKey = body.agentKey;
  if (body.comment) {
    task.comments.push({ text: body.comment, by: "angel", at: new Date().toISOString() });
  }
  task.updatedAt = new Date().toISOString();
  store.tasks[idx] = task;
  await saveTasks(store);

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await loadTasks();
  store.tasks = store.tasks.filter((t) => t.id !== id);
  await saveTasks(store);
  return NextResponse.json({ ok: true });
}
