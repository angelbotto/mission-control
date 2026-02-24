import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../../route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { text, by } = await req.json();

  if (!text || !by) {
    return NextResponse.json({ error: "text and by required" }, { status: 400 });
  }

  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  task.comments.push({ text, by, at: new Date().toISOString() });
  task.updatedAt = new Date().toISOString();
  await saveTasks(store);

  return NextResponse.json(task);
}
