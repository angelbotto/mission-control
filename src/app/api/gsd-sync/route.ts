import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { loadTasks, saveTasks, McTask } from "../mc-tasks/route";

const PLANS_DIR = join(process.env.HOME || "/Users/angelbotto", ".claude/plans");

export async function POST() {
  try {
    let plans: string[] = [];
    try {
      plans = await readdir(PLANS_DIR);
    } catch {
      return NextResponse.json({ synced: 0, message: "No plans directory found" });
    }

    const store = await loadTasks();
    let synced = 0;

    for (const planName of plans) {
      const planDir = join(PLANS_DIR, planName);
      let files: string[] = [];
      try {
        files = (await readdir(planDir)).filter((f) => f.endsWith(".md"));
      } catch {
        // Single file plan
        if (planName.endsWith(".md")) {
          files = [planName];
        } else continue;
      }

      for (const file of files) {
        try {
          const content = await readFile(join(planDir, file), "utf-8");
          const lines = content.split("\n");
          const title = lines.find((l) => l.startsWith("# "))?.replace("# ", "").trim() || file.replace(".md", "");

          // Check for duplicates
          if (store.tasks.some((t) => t.title === title && t.source === "gsd")) continue;

          const now = new Date().toISOString();
          const task: McTask = {
            id: randomUUID(),
            title,
            description: content.slice(0, 500),
            agentId: "",
            agentKey: "",
            column: "backlog",
            createdAt: now,
            updatedAt: now,
            createdBy: "gsd",
            comments: [],
            source: "gsd",
          };

          store.tasks.push(task);
          synced++;
        } catch {
          // skip
        }
      }
    }

    if (synced > 0) await saveTasks(store);

    return NextResponse.json({ synced, total: store.tasks.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
