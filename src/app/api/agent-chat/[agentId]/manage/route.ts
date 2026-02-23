import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, rename, unlink } from "fs/promises";
import { join } from "path";
import { AGENTS } from "@/lib/agents";

const AGENTS_DIR = process.env.AGENTS_DIR || "/Users/angelbotto/.openclaw/agents";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { action } = await req.json().catch(() => ({ action: "clear" }));

  const agent = AGENTS.find((a) => a.key === agentId);
  const dirName = agent?.dirName || agentId.toLowerCase();
  const sessionsDir = join(AGENTS_DIR, dirName, "sessions");

  try {
    const files = (await readdir(sessionsDir)).filter((f) => f.endsWith(".jsonl"));
    if (files.length === 0) return NextResponse.json({ ok: true, message: "No sessions found" });

    // Find most recent
    const stats = await Promise.all(
      files.map(async (f) => ({ name: f, mtime: (await stat(join(sessionsDir, f))).mtimeMs }))
    );
    stats.sort((a, b) => b.mtime - a.mtime);
    const latestPath = join(sessionsDir, stats[0].name);

    if (action === "clear") {
      // Backup then truncate
      const backupPath = latestPath + `.backup-${Date.now()}`;
      await rename(latestPath, backupPath);
      return NextResponse.json({ ok: true, message: "History cleared (backup saved)" });
    } else if (action === "reset") {
      // Delete completely
      await unlink(latestPath);
      return NextResponse.json({ ok: true, message: "Session reset" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
