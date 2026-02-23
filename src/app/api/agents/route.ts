import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { AGENTS, getStatusFromTimestamp, AgentStatus } from "@/lib/agents";

const AGENTS_DIR = process.env.AGENTS_DIR || "/Users/angelbotto/.openclaw/agents";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:18789";

interface AgentInfo {
  key: string;
  emoji: string;
  role: string;
  model: string;
  status: AgentStatus;
  lastActivity: string | null;
  sessionCount: number;
  totalTokens: number;
}

async function readAgentInfo(dirName: string): Promise<{
  lastActivity: string | null;
  model: string | null;
  sessionCount: number;
  totalTokens: number;
}> {
  const sessionsDir = join(AGENTS_DIR, dirName, "sessions");

  let files: string[] = [];
  try {
    const all = await readdir(sessionsDir);
    files = all.filter((f) => f.endsWith(".jsonl"));
  } catch {
    return { lastActivity: null, model: null, sessionCount: 0, totalTokens: 0 };
  }

  if (files.length === 0) {
    return { lastActivity: null, model: null, sessionCount: 0, totalTokens: 0 };
  }

  // Sort by file mtime descending — always read the truly most recent session
  const filesWithStat = await Promise.all(
    files.map(async (f) => {
      try {
        const s = await stat(join(sessionsDir, f));
        return { name: f, mtimeMs: s.mtimeMs };
      } catch {
        return { name: f, mtimeMs: 0 };
      }
    })
  );
  filesWithStat.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latestFile = join(sessionsDir, filesWithStat[0].name);

  let lastActivity: string | null = null;
  let model: string | null = null;
  let totalTokens = 0;

  try {
    const content = await readFile(latestFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // Parse in reverse to find last activity and model from most recent events
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const event = JSON.parse(lines[i]);

        if (!lastActivity && event.timestamp) {
          lastActivity = event.timestamp;
        }

        // model-snapshot event type (OpenClaw specific)
        if (!model && event.type === "model-snapshot" && event.model) {
          model = event.model;
        }

        // Model from assistant message
        if (!model && event.type === "message" && event.message?.role === "assistant" && event.message?.model) {
          model = event.message.model;
        }

        // Accumulate tokens from all lines (forward scan would be slower, keep reverse)
        if (event.type === "message" && event.message?.usage) {
          totalTokens +=
            (event.message.usage.input || 0) +
            (event.message.usage.output || 0);
        }

        if (lastActivity && model) break;
      } catch {
        // skip malformed line
      }
    }

    // Second pass for tokens if we broke early
    if (totalTokens === 0) {
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.type === "message" && event.message?.usage) {
            totalTokens +=
              (event.message.usage.input || 0) +
              (event.message.usage.output || 0);
          }
        } catch {
          // skip
        }
      }
    }
  } catch {
    // file unreadable
  }

  return {
    lastActivity,
    model,
    sessionCount: files.length,
    totalTokens,
  };
}

async function tryGateway(): Promise<Record<string, { active: boolean }>> {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/agents`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // gateway not available
  }
  return {};
}

export async function GET() {
  // Try gateway for real-time active status (best effort)
  const gatewayData = await tryGateway();

  const results: AgentInfo[] = await Promise.all(
    AGENTS.map(async (agent) => {
      const { lastActivity, model, sessionCount, totalTokens } =
        await readAgentInfo(agent.dirName);

      let status = getStatusFromTimestamp(lastActivity);

      // Gateway override: if gateway says active, mark as online
      if (gatewayData[agent.dirName]?.active) {
        status = "online";
      }

      return {
        key: agent.key,
        emoji: agent.emoji,
        role: agent.role,
        model: model || agent.defaultModel,
        status,
        lastActivity,
        sessionCount,
        totalTokens,
      };
    })
  );

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
