import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  try {
    const { agentId, message } = await req.json();
    if (!agentId || !message) {
      return NextResponse.json({ error: "agentId and message required" }, { status: 400 });
    }

    const sessionKey = AGENT_SESSION_MAP[agentId];
    if (!sessionKey) {
      return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 });
    }

    // Use openclaw CLI to send message
    const escapedMsg = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    try {
      await execAsync(
        `openclaw sessions send --session "${sessionKey}" --message "${escapedMsg}"`,
        { timeout: 15000 }
      );
    } catch (e) {
      // Try Gateway REST as fallback
      const gwUrl = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
      const res = await fetch(
        `${gwUrl}/api/sessions/${encodeURIComponent(sessionKey)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) {
        throw e;
      }
    }

    return NextResponse.json({ ok: true, sessionKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
