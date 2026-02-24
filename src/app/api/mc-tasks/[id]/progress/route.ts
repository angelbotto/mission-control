import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../../route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { progress } = body;

  if (typeof progress !== "number" || progress < 0 || progress > 100) {
    return NextResponse.json({ error: "progress must be 0-100" }, { status: 400 });
  }

  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  task.progress = progress;
  task.updatedAt = new Date().toISOString();
  await saveTasks(store);

  return NextResponse.json(task);
}
