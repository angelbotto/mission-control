"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Shell from "@/components/Shell";
import { formatRelativeTime } from "@/lib/agents";

interface Agent {
  key: string;
  emoji: string;
  role: string;
  status: string;
  dirName?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  model?: string;
}

const STATUS_COLORS: Record<string, string> = { online: "#00c691", idle: "#f59e0b", offline: "#ef4444" };

export default function ChatPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Aggressive polling after send
  const startPolling = useCallback((agentKey: string) => {
    setPolling(true);
    let count = 0;
    const poll = () => {
      if (count >= 15) { setPolling(false); return; } // 30s max
      count++;
      loadHistory(agentKey);
      pollTimerRef.current = setTimeout(poll, 2000);
    };
    poll();
  }, [loadHistory]);

  useEffect(() => {
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text, timestamp: new Date().toISOString() }]);

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent, message: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Send failed:", err);
      }
      startPolling(selectedAgent);
    } catch (e) {
      console.error("Send error:", e);
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    if (!selectedAgent) return;
    if (!confirm("¿Limpiar historial? Se hará backup.")) return;
    await fetch(`/api/agent-chat/${encodeURIComponent(selectedAgent)}/manage`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    setMessages([]);
  };

  const resetSession = async () => {
    if (!selectedAgent) return;
    if (!confirm("¿Reset completo de sesión? Se elimina el JSONL.")) return;
    await fetch(`/api/agent-chat/${encodeURIComponent(selectedAgent)}/manage`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    setMessages([]);
  };

  const selectedInfo = agents.find((a) => a.key === selectedAgent);

  return (
    <Shell>
      <div style={{ display: "flex", height: "calc(100vh - 130px)", gap: 0 }}>
        {/* Sidebar - Agent List */}
        <div style={{
          width: 200, minWidth: 200, background: "#0a0a0a", borderRight: "1px solid #1f1f1f",
          borderRadius: "12px 0 0 12px", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #1f1f1f" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Agentes</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {agents.map((a) => (
              <div key={a.key} onClick={() => setSelectedAgent(a.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  cursor: "pointer", transition: "background 150ms",
                  background: selectedAgent === a.key ? "#161620" : "transparent",
                  borderLeft: selectedAgent === a.key ? "3px solid #00c691" : "3px solid transparent",
                }}>
                <span style={{ fontSize: 18 }}>{a.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: selectedAgent === a.key ? "#ededed" : "#999" }}>{a.key}</div>
                  <div style={{ fontSize: 10, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.role}</div>
                </div>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: STATUS_COLORS[a.status] || "#555",
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0d0d0d", borderRadius: "0 12px 12px 0", border: "1px solid #1f1f1f", borderLeft: "none" }}>
          {/* Chat Header */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {selectedInfo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{selectedInfo.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>Conversación con {selectedInfo.key}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{selectedInfo.role} • {selectedInfo.status}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#555" }}>Chat con Agentes</div>
            )}
            {selectedInfo && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={clearHistory} title="Limpiar historial"
                  style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 10px", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  🗑️ Limpiar
                </button>
                <button onClick={resetSession} title="Reset sesión"
                  style={{ background: "#1a1111", border: "1px solid #3a1a1a", borderRadius: 6, padding: "5px 10px", color: "#e55", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  🔄 Reset
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {!selectedAgent ? (
              <div style={{ color: "#333", fontSize: 13, textAlign: "center", paddingTop: 80 }}>← Selecciona un agente para chatear</div>
            ) : loading && messages.length === 0 ? (
              <div style={{ color: "#555", fontSize: 13, textAlign: "center", paddingTop: 80 }}>Cargando historial…</div>
            ) : messages.length === 0 ? (
              <div style={{ color: "#333", fontSize: 13, textAlign: "center", paddingTop: 80 }}>Sin mensajes aún. Escribe algo para iniciar.</div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "10px 14px",
                  background: msg.role === "user" ? "#111822" : "#111",
                  borderRadius: 10, border: "1px solid #1a1a1a",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 2 }}>
                    {msg.role === "user" ? "👤" : (selectedInfo?.emoji || "🤖")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 3, fontWeight: 500 }}>
                      {msg.role === "user" ? "Angel" : selectedInfo?.key || "Agente"}
                    </div>
                    <p style={{ fontSize: 13, color: msg.role === "user" ? "#ccd" : "#aaa", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {msg.text}
                    </p>
                    <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>
                      {formatRelativeTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {(sending || polling) && (
              <div style={{ fontSize: 12, color: "#555", padding: "4px 12px", fontStyle: "italic" }}>
                {selectedInfo?.emoji} {sending ? "enviando..." : "esperando respuesta..."}
              </div>
            )}
          </div>

          {/* Input */}
          {selectedAgent && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #1f1f1f", display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Escribe un mensaje para ${selectedInfo?.key || "agente"}...`}
                disabled={sending}
                style={{
                  flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                  padding: "10px 14px", color: "#ededed", fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={sendMessage} disabled={sending || !input.trim()}
                style={{
                  background: input.trim() ? "#00c691" : "#1a3a2a", color: input.trim() ? "#0a0a0a" : "#555",
                  border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 16,
                  cursor: input.trim() ? "pointer" : "default", fontFamily: "inherit",
                }}>
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
