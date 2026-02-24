import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { loadTasks, saveTasks } from "../../route";
import { appendActivity } from "../../activity/route";

type Column = "backlog" | "queue" | "working" | "review" | "done";
type Actor = "angel" | "agent";

const ALLOWED_MOVES: Record<string, { targets: Column[]; actors: Actor[] }[]> = {
  backlog: [{ targets: ["queue"], actors: ["angel"] }],
  queue: [{ targets: ["working"], actors: ["angel", "agent"] }, { targets: ["backlog"], actors: ["angel"] }],
  working: [{ targets: ["review"], actors: ["angel", "agent"] }, { targets: ["backlog"], actors: ["angel"] }],
  review: [{ targets: ["done"], actors: ["angel"] }, { targets: ["working"], actors: ["angel"] }, { targets: ["backlog"], actors: ["angel"] }],
  done: [{ targets: ["backlog"], actors: ["angel"] }],
};

function isAllowed(from: string, to: string, actor: Actor): boolean {
  const rules = ALLOWED_MOVES[from];
  if (!rules) return false;
  return rules.some((r) => r.targets.includes(to as Column) && r.actors.includes(actor));
}

function getAllowedTargets(from: string, actor: Actor): Column[] {
  const rules = ALLOWED_MOVES[from];
  if (!rules) return [];
  return rules.filter((r) => r.actors.includes(actor)).flatMap((r) => r.targets);
}

function triggerDispatcher(task: { id: string; title: string; agentId?: string; agentKey?: string }) {
  const agent = task.agentKey || task.agentId || "K";
  const text = `📋 Tarea en Working: "${task.title}" (asignada a ${agent}, id: ${task.id}). Ejecuta inmediatamente. Cuando termines, mueve la tarea a review (NO a done) usando POST http://localhost:3001/api/mc-tasks/${task.id}/move con {"column": "review", "actor": "agent"}`;
  exec(`openclaw system event --text ${JSON.stringify(text)} --mode now`, (err) => {
    if (err) console.error("[mc-move] trigger error:", err.message);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { column } = body;
  const actor: Actor = body.actor === "agent" ? "agent" : "angel";
  const valid = ["backlog", "queue", "working", "review", "done"];
  if (!valid.includes(column)) {
    return NextResponse.json({ error: "invalid column" }, { status: 400 });
  }

  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!isAllowed(task.column, column, actor)) {
    return NextResponse.json(
      { error: "Move not allowed", allowed: getAllowedTargets(task.column, actor) },
      { status: 403 }
    );
  }

  task.column = column;
  task.updatedAt = new Date().toISOString();
  await saveTasks(store);

  appendActivity({ type: "move", taskId: id, taskTitle: task.title, agent: task.agentKey || "Sistema", detail: `movió a ${column}` }).catch(() => {});

  if (column === "working") {
    triggerDispatcher(task);
  }

  return NextResponse.json(task);
}
