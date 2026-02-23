import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../../route";

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

  return NextResponse.json(task);
}
