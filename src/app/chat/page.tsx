"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface Agent {
  key: string;
  emoji: string;
  role: string;
  status: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  model?: string;
}

export default function ChatPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.ok ? r.json() : []).then(setAgents).catch(() => {});
  }, []);

  const loadHistory = useCallback(async (agentKey: string) => {
    if (!agentKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agent-chat/${encodeURIComponent(agentKey)}/history`);
      if (res.ok) setMessages(await res.json());
      else setMessages([]);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadHistory(selectedAgent);
      const i = setInterval(() => loadHistory(selectedAgent), 5000);
      return () => clearInterval(i);
    }
  }, [selectedAgent, loadHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    setMessages((prev) => [...prev, { role: "user", text, timestamp: new Date().toISOString() }]);

    try {
      await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent, message: text }),
      });
      // Reload history after a short delay
      setTimeout(() => loadHistory(selectedAgent), 2000);
    } catch { /* ignore */ }
    finally {
      setSending(false);
    }
  };

  const selectedInfo = agents.find((a) => a.key === selectedAgent);
  const statusColors: Record<string, string> = { online: "#00c691", idle: "#f59e0b", offline: "#ef4444" };

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Chat con Agentes
          </h2>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
            style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "6px 10px", color: "#ccc", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
            <option value="">Seleccionar agente...</option>
            {agents.map((a) => <option key={a.key} value={a.key}>{a.emoji} {a.key} — {a.role}</option>)}
          </select>
          {selectedInfo && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColors[selectedInfo.status] || "#555", display: "inline-block" }} />
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 10, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {!selectedAgent ? (
            <div style={{ color: "#333", fontSize: 13, textAlign: "center", paddingTop: 60 }}>Selecciona un agente para chatear</div>
          ) : loading && messages.length === 0 ? (
            <div style={{ color: "#555", fontSize: 13, textAlign: "center", paddingTop: 60 }}>Cargando historial…</div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#333", fontSize: 13, textAlign: "center", paddingTop: 60 }}>Sin mensajes aún</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "8px 12px",
                background: msg.role === "user" ? "#111" : "#0f0f0f",
                borderRadius: 8, border: "1px solid #1a1a1a",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 2 }}>
                  {msg.role === "user" ? "👤" : (selectedInfo?.emoji || "🤖")}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: msg.role === "user" ? "#ccc" : "#aaa", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.text}
                  </p>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>
                    {formatRelativeTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div style={{ fontSize: 12, color: "#555", padding: "4px 12px", fontStyle: "italic" }}>
              {selectedInfo?.emoji} escribiendo...
            </div>
          )}
        </div>

        {/* Input */}
        {selectedAgent && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Mensaje para ${selectedInfo?.key || "agente"}...`}
              disabled={sending}
              style={{
                flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                padding: "10px 14px", color: "#ededed", fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              style={{
                background: input.trim() ? "#00c691" : "#1a3a2a", color: input.trim() ? "#0a0a0a" : "#555",
                border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600,
                cursor: input.trim() ? "pointer" : "default", fontFamily: "inherit",
              }}>
              Enviar
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
