import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { AGENTS } from "@/lib/agents";

const AGENTS_DIR = process.env.AGENTS_DIR || "/Users/angelbotto/.openclaw/agents";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  model?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  // Find agent dirName
  const agent = AGENTS.find((a) => a.key === agentId);
  const dirName = agent?.dirName || agentId.toLowerCase();
  const sessionsDir = join(AGENTS_DIR, dirName, "sessions");

  try {
    const files = (await readdir(sessionsDir)).filter((f) => f.endsWith(".jsonl"));
    if (files.length === 0) return NextResponse.json([]);

    // Get most recent session
    const stats = await Promise.all(
      files.map(async (f) => ({
        name: f,
        mtime: (await stat(join(sessionsDir, f))).mtimeMs,
      }))
    );
    stats.sort((a, b) => b.mtime - a.mtime);

    const content = await readFile(join(sessionsDir, stats[0].name), "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const messages: ChatMessage[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type !== "message" || !event.message) continue;
        const msg = event.message;
        if (msg.role !== "user" && msg.role !== "assistant") continue;

        let text = "";
        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          const textBlock = msg.content.find((c: { type: string }) => c.type === "text");
          if (textBlock?.text) text = textBlock.text;
        }

        if (!text) continue;

        messages.push({
          role: msg.role,
          text: text.slice(0, 2000),
          timestamp: event.timestamp || "",
          model: msg.model,
        });
      } catch {
        // skip
      }
    }

    // Return last 20
    return NextResponse.json(messages.slice(-20), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
