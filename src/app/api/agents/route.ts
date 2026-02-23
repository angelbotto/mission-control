import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { AGENTS, getStatusFromTimestamp, AgentStatus } from "@/lib/agents";

const AGENTS_DIR =
  process.env.AGENTS_DIR || "/Users/angelbotto/.openclaw/agents";
const OPENCLAW_CONFIG =
  process.env.OPENCLAW_CONFIG || "/Users/angelbotto/.openclaw/openclaw.json";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:18789";

interface AgentInfo {
  key: string;
  dirName: string;
  emoji: string;
  role: string;
  model: string;
  status: AgentStatus;
  lastActivity: string | null;
  sessionCount: number;
  totalTokens: number;
}

// ─── SOUL.md parser ────────────────────────────────────────────────────────

async function parseSoulMd(
  soulPath: string
): Promise<{ name: string | null; emoji: string | null }> {
  try {
    const content = await readFile(soulPath, "utf-8");

    // Try title: `# SOUL.md — Iris 🎨`
    const titleMatch = content.match(
      /^#\s+SOUL\.md\s*[—\-]\s*(.+?)\s*([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}])\s*$/mu
    );
    if (titleMatch) {
      return { name: titleMatch[1].trim(), emoji: titleMatch[2] };
    }

    // Try body: `**Soy Iris 🎨 —` or `**Soy K 👽 —`
    const bodyMatch = content.match(
      /\*\*Soy\s+(\S+)(?:\s+([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}⚡]))?/u
    );
    if (bodyMatch) {
      return {
        name: bodyMatch[1] ?? null,
        emoji: bodyMatch[2] ?? null,
      };
    }
  } catch {
    // file unreadable
  }
  return { name: null, emoji: null };
}

// ─── Session reader (unchanged from original) ────────────────────────────

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

  // Sort by mtime descending — always read the truly most recent session
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

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const event = JSON.parse(lines[i]);

        if (!lastActivity && event.timestamp) {
          lastActivity = event.timestamp;
        }
        if (!model && event.type === "model-snapshot" && event.model) {
          model = event.model;
        }
        if (
          !model &&
          event.type === "message" &&
          event.message?.role === "assistant" &&
          event.message?.model
        ) {
          model = event.message.model;
        }
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

  return { lastActivity, model, sessionCount: files.length, totalTokens };
}

// ─── Gateway ─────────────────────────────────────────────────────────────

async function tryGateway(): Promise<Record<string, { active: boolean }>> {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/agents`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
  } catch {
    // gateway not available
  }
  return {};
}

// ─── GET /api/agents ──────────────────────────────────────────────────────

export async function GET() {
  const gatewayData = await tryGateway();

  // Build lookup map from existing AGENTS array (dirName → persona info)
  const agentsByDir = new Map(AGENTS.map((a) => [a.dirName, a]));

  // ── Auto-discover from openclaw.json ─────────────────────────────────
  let configAgents: Array<{ id: string; workspace?: string }> = [];
  try {
    const raw = await readFile(OPENCLAW_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    const allList: Array<{ id: string; workspace?: string; default?: boolean; subagents?: { allowAgents?: string[] } }> =
      config.agents?.list || [];

    // Find the default/main agent to get its allowAgents list
    const mainEntry = allList.find((a) => a.default);
    const allowedIds = new Set<string>([
      "main",
      ...(mainEntry?.subagents?.allowAgents || []),
    ]);

    // Include only Bottico system agents
    configAgents = allList.filter((a) => allowedIds.has(a.id));
  } catch {
    // If we can't read the config, fall back to the hardcoded AGENTS list
    configAgents = AGENTS.map((a) => ({ id: a.dirName, workspace: undefined }));
  }

  const results: AgentInfo[] = await Promise.all(
    configAgents.map(async (agentDef) => {
      const dirName = agentDef.id;
      const { lastActivity, model, sessionCount, totalTokens } =
        await readAgentInfo(dirName);

      let status = getStatusFromTimestamp(lastActivity);
      if (gatewayData[dirName]?.active) status = "online";

      // 1. Try known AGENTS lookup for rich persona info
      const known = agentsByDir.get(dirName);
      if (known) {
        return {
          key: known.key,
          dirName,
          emoji: known.emoji,
          role: known.role,
          model: model || known.defaultModel,
          status,
          lastActivity,
          sessionCount,
          totalTokens,
        };
      }

      // 2. Unknown agent → parse SOUL.md for name/emoji
      let soulName: string | null = null;
      let soulEmoji: string | null = null;
      if (agentDef.workspace) {
        const { name, emoji } = await parseSoulMd(
          join(agentDef.workspace, "SOUL.md")
        );
        soulName = name;
        soulEmoji = emoji;
      }

      // 3. Fallback defaults
      const displayName =
        soulName || dirName.charAt(0).toUpperCase() + dirName.slice(1);
      const displayEmoji = soulEmoji || "🤖";

      return {
        key: displayName,
        dirName,
        emoji: displayEmoji,
        role: "Agente",
        model: model || "claude-sonnet-4-6",
        status,
        lastActivity,
        sessionCount,
        totalTokens,
      };
    })
  );

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
