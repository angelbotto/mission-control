import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../../route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, url, addedBy } = await req.json();

  if (!name || !url || !addedBy) {
    return NextResponse.json(
      { error: "name, url, and addedBy required" },
      { status: 400 }
    );
  }

  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const attachment = { name, url, addedBy, addedAt: new Date().toISOString() };
  if (!task.attachments) task.attachments = [];
  task.attachments.push(attachment);
  task.updatedAt = new Date().toISOString();
  await saveTasks(store);

  return NextResponse.json(task);
}
