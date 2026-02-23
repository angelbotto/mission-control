import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || process.env.GATEWAY_URL || "http://localhost:18789";

const AGENT_SESSION_MAP: Record<string, string> = {
  K: "agent:main:main",
  Vera: "agent:assistant:main",
  Nexo: "agent:infra:main",
  Pluma: "agent:content:main",
  Arq: "agent:coder:main",
  Oráculo: "agent:research:main",
  Vault: "agent:finance:main",
};

export async function POST(req: NextRequest) {
  try {
    const { agentKey, message } = await req.json();

    if (!agentKey || !message) {
      return NextResponse.json({ error: "agentKey and message required" }, { status: 400 });
    }

    const sessionKey = AGENT_SESSION_MAP[agentKey];
    if (!sessionKey) {
      return NextResponse.json({ error: `Unknown agent: ${agentKey}` }, { status: 400 });
    }

    // Send via OpenClaw Gateway sessions_send
    const res = await fetch(`${GATEWAY_URL}/api/sessions/${encodeURIComponent(sessionKey)}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Gateway error ${res.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sessionKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
