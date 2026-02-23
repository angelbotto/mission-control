import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { AGENTS } from "@/lib/agents";

const AGENTS_DIR = process.env.AGENTS_DIR || "/Users/angelbotto/.openclaw/agents";
const EVENTS_PER_AGENT = 50;

export interface ActivityEvent {
  id: string;
  agent: string;
  agentEmoji: string;
  timestamp: string;
  type: "message" | "tool_call" | "model_change" | "session_start" | "compaction" | "other";
  label: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  sessionId: string;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

function extractContentText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textBlock = content.find((c: Record<string, unknown>) => c.type === "text");
    if (textBlock && typeof textBlock.text === "string") return textBlock.text;
  }
  return null;
}

function extractToolInfo(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const toolUse = content.find((c: Record<string, unknown>) => c.type === "tool_use");
  if (toolUse && toolUse.name) return `🔧 Llamó ${toolUse.name}`;
  const toolResult = content.find((c: Record<string, unknown>) => c.type === "tool_result");
  if (toolResult && toolResult.name) return `📁 Resultado de ${toolResult.name}`;
  return null;
}

function classifyEvent(event: Record<string, unknown>): ActivityEvent["type"] {
  const t = event.type as string;
  if (t === "message") return "message";
  if (t === "model_change") return "model_change";
  if (t === "session") return "session_start";
  if (t === "compaction") return "compaction";
  if (t === "custom") {
    const ct = (event.customType as string) || "";
    if (ct.includes("tool")) return "tool_call";
  }
  return "other";
}

function labelForEvent(event: Record<string, unknown>, type: ActivityEvent["type"]): string {
  switch (type) {
    case "message": {
      const msg = event.message as Record<string, unknown> | undefined;
      if (!msg) return "Mensaje";
      const role = (msg.role as string) || "unknown";
      const content = msg.content;

      if (role === "user") {
        const text = extractContentText(content);
        if (text) return truncate(text.replace(/\n/g, " "), 120);
        return "Mensaje de usuario";
      }

      if (role === "assistant") {
        // Check for tool use first
        const toolInfo = extractToolInfo(content);
        if (toolInfo) return toolInfo;
        // Then text content
        const text = extractContentText(content);
        if (text) return truncate(text.replace(/\n/g, " "), 120);
        return "Respuesta de asistente";
      }

      return `${role}: mensaje`;
    }
    case "model_change":
      return `Modelo: ${event.modelId || "unknown"}`;
    case "session_start":
      return "Sesión iniciada";
    case "compaction":
      return "Contexto compactado";
    case "tool_call":
      return `Tool call: ${(event.customType as string) || "unknown"}`;
    default:
      return (event.type as string) || "evento";
  }
}

async function getLatestSessionFile(dirName: string): Promise<{ filePath: string; sessionId: string } | null> {
  const sessionsDir = join(AGENTS_DIR, dirName, "sessions");
  try {
    const files = (await readdir(sessionsDir)).filter((f) => f.endsWith(".jsonl"));
    if (files.length === 0) return null;
    const stats = await Promise.all(
      files.map(async (f) => ({
        name: f,
        mtime: (await stat(join(sessionsDir, f))).mtime,
      }))
    );
    stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return {
      filePath: join(sessionsDir, stats[0].name),
      sessionId: stats[0].name.replace(".jsonl", ""),
    };
  } catch {
    return null;
  }
}

async function readAgentActivity(
  agentKey: string,
  agentEmoji: string,
  dirName: string
): Promise<ActivityEvent[]> {
  const session = await getLatestSessionFile(dirName);
  if (!session) return [];

  const events: ActivityEvent[] = [];

  try {
    const content = await readFile(session.filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const tail = lines.slice(-EVENTS_PER_AGENT);

    for (const line of tail) {
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        if (!event.timestamp) continue;
        const t = event.type as string;
        if (t === "thinking_level_change") continue;

        const type = classifyEvent(event);

        const msg = (event.message as Record<string, unknown>) || undefined;
        const usage = msg?.usage as Record<string, number> | undefined;

        events.push({
          id: (event.id as string) || Math.random().toString(36).slice(2),
          agent: agentKey,
          agentEmoji,
          timestamp: event.timestamp as string,
          type,
          label: labelForEvent(event, type),
          model: (msg?.model as string) || undefined,
          tokensIn: usage?.input,
          tokensOut: usage?.output,
          sessionId: session.sessionId,
        });
      } catch {
        // skip
      }
    }
  } catch {
    // file unreadable
  }

  return events;
}

export async function GET() {
  const allEvents = await Promise.all(
    AGENTS.map((agent) =>
      readAgentActivity(agent.key, agent.emoji, agent.dirName)
    )
  );

  const merged = allEvents
    .flat()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);

  return NextResponse.json(merged, {
    headers: { "Cache-Control": "no-store" },
  });
}
