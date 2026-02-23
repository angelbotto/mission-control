"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface AgentConversation {
  agent: string;
  agentEmoji: string;
  status: string;
  lastActivity: string | null;
  totalTokens: number;
  messages: Array<{
    role: "user" | "assistant";
    text: string;
    timestamp: string;
  }>;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function ActivityPage() {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch agents info
      const agentsRes = await fetch("/api/agents");
      if (!agentsRes.ok) return;
      const agents = await agentsRes.json();

      // Fetch last 3 messages for each agent
      const convos: AgentConversation[] = await Promise.all(
        agents.map(async (agent: { key: string; emoji: string; status: string; lastActivity: string | null; totalTokens: number; dirName?: string }) => {
          let messages: Array<{ role: "user" | "assistant"; text: string; timestamp: string }> = [];
          try {
            const histRes = await fetch(`/api/agent-chat/${encodeURIComponent(agent.key)}/history`);
            if (histRes.ok) {
              const allMsgs = await histRes.json();
              messages = allMsgs.slice(-6); // last 3 pairs
            }
          } catch { /* ignore */ }

          return {
            agent: agent.key,
            agentEmoji: agent.emoji,
            status: agent.status,
            lastActivity: agent.lastActivity,
            totalTokens: agent.totalTokens,
            messages,
          };
        })
      );

      // Sort by most recent activity
      convos.sort((a, b) => {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(convos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 30000);
    return () => clearInterval(i);
  }, [fetchData]);

  const statusColors: Record<string, string> = { online: "#00c691", idle: "#f59e0b", offline: "#ef4444" };

  return (
    <Shell>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>
        Conversation Log
      </h2>
      <p style={{ fontSize: 11, color: "#333", margin: "0 0 16px 0" }}>{conversations.length} agentes · actualización cada 30s</p>

      {loading ? (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0" }}>Cargando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
          {conversations.map((conv) => (
            <div key={conv.agent} style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 10, padding: "14px 16px" }}>
              {/* Agent header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{conv.agentEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>{conv.agent}</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColors[conv.status] || "#555", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>
                  {formatTokens(conv.totalTokens)} tokens · {formatRelativeTime(conv.lastActivity)}
                </span>
              </div>

              {/* Messages */}
              {conv.messages.length === 0 ? (
                <div style={{ fontSize: 12, color: "#333", padding: "8px 0", fontStyle: "italic" }}>Sin actividad reciente</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {conv.messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
                      <span style={{ fontSize: 10, color: "#444", flexShrink: 0, width: 20, textAlign: "center", paddingTop: 2 }}>
                        {msg.role === "user" ? "👤" : conv.agentEmoji}
                      </span>
                      <p style={{
                        fontSize: 12, color: msg.role === "user" ? "#aaa" : "#888", margin: 0, lineHeight: 1.5,
                        overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
