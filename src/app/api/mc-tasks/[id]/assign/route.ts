import { NextRequest, NextResponse } from "next/server";
import { loadTasks, saveTasks } from "../../route";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const AGENT_SESSION_MAP: Record<string, string> = {
  K: "agent:main:main",
  Vera: "agent:assistant:main",
  Nexo: "agent:infra:main",
  Pluma: "agent:content:main",
  Arq: "agent:coder:main",
  "Oráculo": "agent:research:main",
  Vault: "agent:finance:main",
  Iris: "agent:design:main",
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await loadTasks();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Move to working
  task.column = "working";
  task.updatedAt = new Date().toISOString();
  await saveTasks(store);

  // Send message to agent
  const sessionKey = AGENT_SESSION_MAP[task.agentKey];
  if (sessionKey) {
    const msg = `Nueva tarea asignada: ${task.title}\n\n${task.description}\n\nResponde cuando estés listo.`;
    try {
      await execAsync(
        `openclaw sessions send --session "${sessionKey}" --message "${msg.replace(/"/g, '\\"')}"`,
        { timeout: 10000 }
      );
    } catch {
      // Best effort - task is still moved
    }
  }

  return NextResponse.json({ ok: true, task });
}
