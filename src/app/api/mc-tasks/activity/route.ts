import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export interface ActivityEvent {
  id: string;
  type: "move" | "comment" | "create" | "subtask";
  taskId: string;
  taskTitle: string;
  agent: string;
  detail: string;
  timestamp: string;
}

interface ActivityStore {
  events: ActivityEvent[];
}

const ACTIVITY_FILE = join(
  process.env.WORKSPACE_DIR || "/Users/angelbotto/.openclaw/workspace",
  "mc-activity.json"
);

async function loadActivity(): Promise<ActivityStore> {
  try {
    const raw = await readFile(ACTIVITY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { events: [] };
  }
}

async function saveActivity(store: ActivityStore): Promise<void> {
  await writeFile(ACTIVITY_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function appendActivity(event: Omit<ActivityEvent, "id" | "timestamp">): Promise<void> {
  const store = await loadActivity();
  store.events.push({
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  });
  // Keep only last 200 events
  if (store.events.length > 200) {
    store.events = store.events.slice(-200);
  }
  await saveActivity(store);
}

export async function GET() {
  const store = await loadActivity();
  const sorted = store.events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return NextResponse.json(sorted.slice(0, 50), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { type, taskId, taskTitle, agent, detail } = await req.json();
    if (!type || !taskId || !taskTitle || !detail) {
      return NextResponse.json({ error: "type, taskId, taskTitle, detail required" }, { status: 400 });
    }
    await appendActivity({ type, taskId, taskTitle, agent: agent || "Sistema", detail });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
