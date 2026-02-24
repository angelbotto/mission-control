import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../../route";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  task.column = "done";
  task.updatedAt = new Date().toISOString();
  task.comments.push({ text: "Approved from review", by: "angel", at: new Date().toISOString() });
  await saveTasks(store);

  return NextResponse.json({ ok: true, task });
}
